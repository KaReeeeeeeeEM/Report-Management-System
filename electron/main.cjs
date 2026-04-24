const { app, BrowserWindow, ipcMain, shell } = require("electron");
const { existsSync } = require("node:fs");
const { mkdir, writeFile } = require("node:fs/promises");
const http = require("node:http");
const os = require("node:os");
const net = require("node:net");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const { spawn } = require("node:child_process");
const dgram = require("node:dgram");

const DEV_SERVER_URL = process.env.ELECTRON_RENDERER_URL || "http://127.0.0.1:3001";
const DISCOVERY_PORT = 41235;
const SHARE_SAVE_DIRECTORY_NAME = "Report Management Shares";
const DISCOVERY_REQUEST_TYPE = "report-management:discover-request";
const DISCOVERY_RESPONSE_TYPE = "report-management:discover-response";
const SHARE_PATH = "/api/network-share";
const DEVICE_ID = randomUUID();

let mainWindow = null;
let nextServer = null;
let currentAppUrl = null;
let shareServer = null;
let shareServerPort = null;
let discoverySocket = null;
const discoveredPeers = new Map();

function getPreloadPath() {
  return path.join(__dirname, "preload.cjs");
}

function getTextEncoderShimPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "app.asar.unpacked", "electron", "text-encoder-shim.cjs");
  }

  return path.join(__dirname, "text-encoder-shim.cjs");
}

function getServerDebugShimPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "app.asar.unpacked", "electron", "server-debug-shim.cjs");
  }

  return path.join(__dirname, "server-debug-shim.cjs");
}

function getDesktopIconPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "icons", "logo.png");
  }

  return path.join(app.getAppPath(), "electron", "icons", "logo.png");
}

function getServerRuntimeBinary() {
  const candidates = [
    process.env.DESKTOP_NODE_BINARY,
    process.env.NODE_BINARY,
    "/usr/local/bin/node",
    "/opt/homebrew/bin/node",
    process.execPath,
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (candidate === process.execPath || existsSync(candidate)) {
      return candidate;
    }
  }

  return process.execPath;
}

function getLocalHostName() {
  return os.hostname() || "Unknown device";
}

function getLocalAddressCandidates() {
  const interfaces = os.networkInterfaces();
  const addresses = [];

  for (const interfaceAddresses of Object.values(interfaces)) {
    for (const addressInfo of interfaceAddresses ?? []) {
      if (addressInfo.family !== "IPv4" || addressInfo.internal) {
        continue;
      }

      addresses.push(addressInfo.address);
    }
  }

  return addresses;
}

function ipToInteger(ipAddress) {
  return ipAddress.split(".").reduce((result, segment) => ((result << 8) | Number(segment)) >>> 0, 0);
}

function integerToIp(value) {
  return [
    (value >>> 24) & 255,
    (value >>> 16) & 255,
    (value >>> 8) & 255,
    value & 255,
  ].join(".");
}

function getBroadcastAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = new Set(["255.255.255.255"]);

  for (const interfaceAddresses of Object.values(interfaces)) {
    for (const addressInfo of interfaceAddresses ?? []) {
      if (addressInfo.family !== "IPv4" || addressInfo.internal || !addressInfo.netmask) {
        continue;
      }

      const ipValue = ipToInteger(addressInfo.address);
      const maskValue = ipToInteger(addressInfo.netmask);
      const broadcastValue = (ipValue & maskValue) | (~maskValue >>> 0);
      addresses.add(integerToIp(broadcastValue >>> 0));
    }
  }

  return Array.from(addresses);
}

function getLocalDevicePayload() {
  return {
    id: DEVICE_ID,
    name: getLocalHostName(),
    platform: process.platform,
    addresses: getLocalAddressCandidates(),
    transferPort: shareServerPort,
  };
}

function pruneDiscoveredPeers() {
  const cutoff = Date.now() - 20000;

  for (const [peerId, peer] of discoveredPeers.entries()) {
    if (peer.lastSeenAt < cutoff) {
      discoveredPeers.delete(peerId);
    }
  }
}

function normalizePeerAddress(peer) {
  return peer.address || peer.addresses.find(Boolean) || "Unknown address";
}

function emitIncomingShare(payload) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  mainWindow.webContents.send("network-share:received", payload);
}

function registerPeer(peer, fallbackAddress) {
  if (!peer || peer.id === DEVICE_ID || !peer.transferPort) {
    return;
  }

  discoveredPeers.set(peer.id, {
    id: peer.id,
    name: peer.name || "Unknown device",
    platform: peer.platform || "unknown",
    addresses: Array.isArray(peer.addresses) && peer.addresses.length > 0 ? peer.addresses : [fallbackAddress],
    address: fallbackAddress,
    transferPort: peer.transferPort,
    lastSeenAt: Date.now(),
  });
}

async function ensureShareServer() {
  if (shareServer && shareServerPort) {
    return shareServerPort;
  }

  const port = await getAvailablePort();

  shareServer = http.createServer(async (request, response) => {
    if (request.method !== "POST" || request.url !== SHARE_PATH) {
      response.writeHead(404);
      response.end();
      return;
    }

    const chunks = [];

    request.on("data", (chunk) => {
      chunks.push(chunk);
    });

    request.on("error", () => {
      response.writeHead(500);
      response.end();
    });

    request.on("end", async () => {
      try {
        const fileBuffer = Buffer.concat(chunks);
        const originalFileName = path.basename(
          Array.isArray(request.headers["x-file-name"]) ? request.headers["x-file-name"][0] : request.headers["x-file-name"] || "shared-report.pdf",
        );
        const senderName = Array.isArray(request.headers["x-sender-name"])
          ? request.headers["x-sender-name"][0]
          : request.headers["x-sender-name"] || "Unknown device";
        const reportTitle = Array.isArray(request.headers["x-report-title"])
          ? request.headers["x-report-title"][0]
          : request.headers["x-report-title"] || originalFileName;
        const sharesDirectory = path.join(app.getPath("downloads"), SHARE_SAVE_DIRECTORY_NAME);
        const targetPath = path.join(sharesDirectory, `${Date.now()}-${originalFileName}`);

        await mkdir(sharesDirectory, { recursive: true });
        await writeFile(targetPath, fileBuffer);

        emitIncomingShare({
          fileName: originalFileName,
          reportTitle,
          savedTo: targetPath,
          senderName,
        });

        response.writeHead(200, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ savedTo: targetPath }));
      } catch (error) {
        response.writeHead(500, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ message: error instanceof Error ? error.message : "Could not save the shared file." }));
      }
    });
  });

  await new Promise((resolve, reject) => {
    shareServer.once("error", reject);
    shareServer.listen(port, "0.0.0.0", () => {
      shareServerPort = port;
      resolve();
    });
  });

  return shareServerPort;
}

async function ensureDiscoveryService() {
  await ensureShareServer();

  if (discoverySocket) {
    return;
  }

  discoverySocket = dgram.createSocket({ type: "udp4", reuseAddr: true });

  discoverySocket.on("message", (message, remoteInfo) => {
    let payload;

    try {
      payload = JSON.parse(message.toString("utf8"));
    } catch {
      return;
    }

    if (payload.type === DISCOVERY_REQUEST_TYPE) {
      if (payload.deviceId === DEVICE_ID) {
        return;
      }

      const responsePayload = Buffer.from(
        JSON.stringify({
          type: DISCOVERY_RESPONSE_TYPE,
          device: getLocalDevicePayload(),
        }),
        "utf8",
      );

      discoverySocket.send(responsePayload, remoteInfo.port, remoteInfo.address);
      return;
    }

    if (payload.type === DISCOVERY_RESPONSE_TYPE) {
      registerPeer(payload.device, remoteInfo.address);
    }
  });

  await new Promise((resolve, reject) => {
    discoverySocket.once("error", reject);
    discoverySocket.bind(DISCOVERY_PORT, "0.0.0.0", () => {
      discoverySocket.setBroadcast(true);
      resolve();
    });
  });
}

async function sendDiscoveryProbe() {
  await ensureDiscoveryService();

  const message = Buffer.from(
    JSON.stringify({
      type: DISCOVERY_REQUEST_TYPE,
      deviceId: DEVICE_ID,
    }),
    "utf8",
  );

  await Promise.all(
    getBroadcastAddresses().map(
      (broadcastAddress) =>
        new Promise((resolve) => {
          discoverySocket.send(message, DISCOVERY_PORT, broadcastAddress, () => resolve());
        }),
    ),
  );
}

async function listNetworkDevices() {
  await sendDiscoveryProbe();

  await new Promise((resolve) => {
    setTimeout(resolve, 1200);
  });

  pruneDiscoveredPeers();

  return Array.from(discoveredPeers.values())
    .map((peer) => ({
      id: peer.id,
      name: peer.name,
      platform: peer.platform,
      address: normalizePeerAddress(peer),
      transferPort: peer.transferPort,
      lastSeenAt: peer.lastSeenAt,
    }))
    .sort((left, right) => right.lastSeenAt - left.lastSeenAt);
}

async function sendFileToPeer(payload) {
  await ensureDiscoveryService();
  pruneDiscoveredPeers();

  const peer = discoveredPeers.get(payload.deviceId);

  if (!peer) {
    throw new Error("That device is no longer available. Refresh the list and try again.");
  }

  const fileBuffer = Buffer.isBuffer(payload.data) ? payload.data : Buffer.from(payload.data);
  const targetAddress = normalizePeerAddress(peer);

  return new Promise((resolve, reject) => {
    const request = http.request(
      {
        host: targetAddress,
        port: peer.transferPort,
        path: SHARE_PATH,
        method: "POST",
        headers: {
          "Content-Type": payload.mimeType || "application/octet-stream",
          "Content-Length": fileBuffer.length,
          "X-File-Name": path.basename(payload.fileName || "shared-report.pdf"),
          "X-Report-Title": payload.reportTitle || payload.fileName || "Shared report",
          "X-Sender-Name": getLocalHostName(),
          "X-Sender-Id": DEVICE_ID,
        },
      },
      (response) => {
        const chunks = [];

        response.on("data", (chunk) => {
          chunks.push(chunk);
        });

        response.on("end", () => {
          if ((response.statusCode || 500) >= 400) {
            const body = Buffer.concat(chunks).toString("utf8");

            try {
              const parsedBody = JSON.parse(body);
              reject(new Error(parsedBody.message || "The receiving device rejected the file."));
            } catch {
              reject(new Error("The receiving device rejected the file."));
            }

            return;
          }

          try {
            const body = Buffer.concat(chunks).toString("utf8");
            resolve(body ? JSON.parse(body) : {});
          } catch {
            resolve({});
          }
        });
      },
    );

    request.on("error", () => {
      reject(new Error("Could not connect to the selected device."));
    });

    request.write(fileBuffer);
    request.end();
  });
}

function createWindow(targetUrl) {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1180,
    minHeight: 760,
    backgroundColor: "#090909",
    autoHideMenuBar: true,
    icon: getDesktopIconPath(),
    title: "Report Management System",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: getPreloadPath(),
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.loadURL(targetUrl);

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function waitForUrl(targetUrl, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;

  return new Promise((resolve, reject) => {
    const attempt = () => {
      const request = http.get(targetUrl, (response) => {
        response.resume();
        resolve();
      });

      request.on("error", () => {
        if (Date.now() > deadline) {
          reject(new Error(`Timed out waiting for ${targetUrl}`));
          return;
        }

        setTimeout(attempt, 500);
      });
    };

    attempt();
  });
}

function getAvailablePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();

    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();

      if (!address || typeof address === "string") {
        server.close(() => reject(new Error("Could not determine an open port.")));
        return;
      }

      const { port } = address;
      server.close((closeError) => {
        if (closeError) {
          reject(closeError);
          return;
        }

        resolve(port);
      });
    });
  });
}

async function startBundledServer() {
  const port = await getAvailablePort();
  const bundledAppRoot = path.join(process.resourcesPath, "app.asar.unpacked", "electron", "bundle", "app");
  const serverScript = path.join(bundledAppRoot, "server.js");
  const storageRoot = path.join(app.getPath("userData"), "storage", "reports");
  const runtimeBinary = getServerRuntimeBinary();
  const runtimeArgs =
    runtimeBinary === process.execPath
      ? ["--require", getServerDebugShimPath(), "--require", getTextEncoderShimPath(), serverScript]
      : ["--require", getServerDebugShimPath(), serverScript];
  const runtimeEnv = {
    ...process.env,
    ELECTRON_EMBEDDED_DB: "true",
    DESKTOP_DATA_ROOT: path.join(app.getPath("userData"), "data"),
    HOSTNAME: "127.0.0.1",
    NODE_ENV: "production",
    PORT: String(port),
    REPORT_STORAGE_ROOT: storageRoot,
  };

  if (runtimeBinary === process.execPath) {
    runtimeEnv.ELECTRON_RUN_AS_NODE = "1";
  } else {
    delete runtimeEnv.ELECTRON_RUN_AS_NODE;
  }

  console.log(`[desktop] Starting bundled server with ${runtimeBinary}`);

  nextServer = spawn(runtimeBinary, runtimeArgs, {
    cwd: bundledAppRoot,
    env: runtimeEnv,
    stdio: "inherit",
  });

  nextServer.on("exit", (code) => {
    nextServer = null;

    if (code !== 0 && !app.isQuitting) {
      app.quit();
    }
  });

  const serverUrl = `http://127.0.0.1:${port}/login`;
  await waitForUrl(serverUrl);
  return serverUrl;
}

async function resolveAppUrl() {
  if (!app.isPackaged) {
    return `${DEV_SERVER_URL}/login`;
  }

  if (currentAppUrl) {
    return currentAppUrl;
  }

  currentAppUrl = await startBundledServer();
  return currentAppUrl;
}

function stopBundledServer() {
  if (nextServer && !nextServer.killed) {
    nextServer.kill("SIGTERM");
  }

  currentAppUrl = null;
}

app.on("before-quit", () => {
  app.isQuitting = true;
  stopBundledServer();

  if (discoverySocket) {
    discoverySocket.close();
    discoverySocket = null;
  }

  if (shareServer) {
    shareServer.close();
    shareServer = null;
    shareServerPort = null;
  }
});

app.whenReady().then(async () => {
  if (process.platform === "darwin" && app.dock) {
    app.dock.setIcon(getDesktopIconPath());
  }

  await ensureDiscoveryService();

  ipcMain.handle("network-share:list-devices", async () => listNetworkDevices());
  ipcMain.handle("network-share:send-file", async (_, payload) => sendFileToPeer(payload));

  const appUrl = await resolveAppUrl();
  createWindow(appUrl);

  app.on("activate", async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow(await resolveAppUrl());
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
