const { app, BrowserWindow, shell } = require("electron");
const http = require("node:http");
const net = require("node:net");
const path = require("node:path");
const { spawn } = require("node:child_process");

const DEV_SERVER_URL = process.env.ELECTRON_RENDERER_URL || "http://127.0.0.1:3001";

let mainWindow = null;
let nextServer = null;
let currentAppUrl = null;

function getPreloadPath() {
  return path.join(__dirname, "preload.cjs");
}

function getDesktopIconPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "icons", "logo.png");
  }

  return path.join(app.getAppPath(), "electron", "icons", "logo.png");
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

  nextServer = spawn(process.execPath, [serverScript], {
    cwd: bundledAppRoot,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      ELECTRON_EMBEDDED_DB: "true",
      DESKTOP_DATA_ROOT: path.join(app.getPath("userData"), "data"),
      HOSTNAME: "127.0.0.1",
      NODE_ENV: "production",
      PORT: String(port),
      REPORT_STORAGE_ROOT: storageRoot,
    },
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
});

app.whenReady().then(async () => {
  if (process.platform === "darwin" && app.dock) {
    app.dock.setIcon(getDesktopIconPath());
  }

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
