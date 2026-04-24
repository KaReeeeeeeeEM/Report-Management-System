import { access } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

const rootDir = process.cwd();
const productName = "Report Management System";
const isMac = process.platform === "darwin";
const isWindows = process.platform === "win32";
const isLinux = process.platform === "linux";
const appPath = isMac
  ? path.join(rootDir, "dist-electron", "mac-arm64", `${productName}.app`)
  : isWindows
    ? path.join(rootDir, "dist-electron", "win-unpacked", `${productName}.exe`)
    : path.join(rootDir, "dist-electron", "linux-unpacked", productName);
const macExecutablePath = path.join(appPath, "Contents", "MacOS", productName);

async function ensureBuiltAppExists() {
  try {
    await access(isMac ? macExecutablePath : appPath);
  } catch {
    throw new Error(`Built desktop app not found at ${isMac ? macExecutablePath : appPath}. Run "pnpm build:desktop" first.`);
  }
}

function getLaunchCommand() {
  if (isMac) {
    return { command: macExecutablePath, args: [] };
  }

  if (isWindows) {
    return { command: appPath, args: [] };
  }

  if (isLinux) {
    return { command: appPath, args: [] };
  }

  throw new Error(`Unsupported platform: ${process.platform}`);
}

async function main() {
  await ensureBuiltAppExists();

  if (process.argv.includes("--print")) {
    console.log(isMac ? macExecutablePath : appPath);
    return;
  }

  const detached = process.argv.includes("--detached");
  const { command, args } = getLaunchCommand();
  const child = spawn(command, args, {
    detached,
    stdio: detached ? "ignore" : "inherit",
  });

  child.on("error", (error) => {
    console.error(error instanceof Error ? error.message : "Could not start the desktop app.");
    process.exit(1);
  });

  if (detached) {
    child.unref();
    console.log(`Opened desktop app from ${isMac ? macExecutablePath : appPath}`);
    return;
  }

  console.log(`Starting desktop app from ${isMac ? macExecutablePath : appPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Could not open the desktop app.");
  process.exit(1);
});
