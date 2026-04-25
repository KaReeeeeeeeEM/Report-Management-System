import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type MongoDetectionResult = {
  installed: boolean;
  binaryPath: string | null;
  version: string | null;
  reachable: boolean;
  port: number;
  platform: NodeJS.Platform;
  notes: string[];
};

const MONGO_PORT = 27017;

function getBinaryCandidates() {
  if (process.platform === "win32") {
    return [
      "mongod.exe",
      "C:\\Program Files\\MongoDB\\Server\\8.0\\bin\\mongod.exe",
      "C:\\Program Files\\MongoDB\\Server\\7.0\\bin\\mongod.exe",
      "C:\\Program Files\\MongoDB\\Server\\6.0\\bin\\mongod.exe",
    ];
  }

  if (process.platform === "darwin") {
    return [
      "mongod",
      "/opt/homebrew/bin/mongod",
      "/usr/local/bin/mongod",
      "/opt/homebrew/opt/mongodb-community@8.0/bin/mongod",
      "/usr/local/opt/mongodb-community@8.0/bin/mongod",
    ];
  }

  return [
    "mongod",
    "/usr/bin/mongod",
    "/usr/local/bin/mongod",
    "/snap/bin/mongod",
  ];
}

async function canAccess(filePath: string) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function resolveMongoBinary() {
  for (const candidate of getBinaryCandidates()) {
    if (path.isAbsolute(candidate)) {
      if (await canAccess(candidate)) {
        return candidate;
      }
      continue;
    }

    try {
      const command = process.platform === "win32" ? "where" : "which";
      const { stdout } = await execFileAsync(command, [candidate]);
      const resolved = stdout.split(/\r?\n/).find(Boolean)?.trim();

      if (resolved) {
        return resolved;
      }
    } catch {
      continue;
    }
  }

  return null;
}

async function checkPortReachable(port: number) {
  return new Promise<boolean>((resolve) => {
    const socket = net.createConnection({ host: "127.0.0.1", port });

    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });

    socket.once("error", () => {
      resolve(false);
    });

    socket.setTimeout(800, () => {
      socket.destroy();
      resolve(false);
    });
  });
}

function parseMongoVersion(output: string) {
  const match = output.match(/db version v?([0-9.]+)/i) ?? output.match(/"version"\s*:\s*"([0-9.]+)"/i);
  return match?.[1] ?? null;
}

export async function detectMongoDbInstallation(): Promise<MongoDetectionResult> {
  const binaryPath = await resolveMongoBinary();
  const reachable = await checkPortReachable(MONGO_PORT);
  const notes: string[] = [];
  let version: string | null = null;

  if (!binaryPath) {
    notes.push("MongoDB server binary was not found in common install locations or PATH.");
  } else {
    try {
      const { stdout, stderr } = await execFileAsync(binaryPath, ["--version"]);
      version = parseMongoVersion(`${stdout}\n${stderr}`);
    } catch {
      notes.push("MongoDB binary was found, but its version could not be read.");
    }
  }

  if (!reachable) {
    notes.push(`No MongoDB server was reachable on localhost:${MONGO_PORT}.`);
  }

  if (reachable && !binaryPath) {
    notes.push("MongoDB appears to be running locally, but the mongod binary could not be resolved.");
  }

  return {
    installed: Boolean(binaryPath),
    binaryPath,
    version,
    reachable,
    port: MONGO_PORT,
    platform: os.platform(),
    notes,
  };
}
