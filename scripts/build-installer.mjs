import { spawn } from "node:child_process";
import path from "node:path";

const requestedTarget = process.argv[2] ?? "current";
const requestedArch = process.argv[3] ?? null;
const rootDir = process.cwd();

const platformConfig = {
  darwin: {
    label: "macOS",
    args: ["--mac", "dmg"],
    defaultArch: process.arch === "x64" ? "x64" : "arm64",
  },
  win32: {
    label: "Windows",
    args: ["--win", "nsis", "zip"],
    defaultArch: "x64",
  },
  linux: {
    label: "Linux",
    args: ["--linux", "AppImage", "deb"],
    defaultArch: "x64",
  },
};

const aliasToPlatform = {
  current: process.platform,
  mac: "darwin",
  win: "win32",
  windows: "win32",
  linux: "linux",
};

const resolvedPlatform = aliasToPlatform[requestedTarget];

if (!resolvedPlatform || !platformConfig[resolvedPlatform]) {
  console.error(`Unsupported installer target "${requestedTarget}". Use one of: current, mac, win, linux.`);
  process.exit(1);
}

const config = platformConfig[resolvedPlatform];
const resolvedArch = requestedArch ?? config.defaultArch;
const supportedArchitectures = new Set(["x64", "arm64"]);

if (!supportedArchitectures.has(resolvedArch)) {
  console.error(`Unsupported architecture "${resolvedArch}". Use x64 or arm64.`);
  process.exit(1);
}

const builderArgs = [...config.args, `--${resolvedArch}`];
const electronBuilderBinary = path.join(
  rootDir,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "electron-builder.cmd" : "electron-builder",
);

const child = spawn(
  process.execPath,
  [
    path.join(rootDir, "scripts", "generate-electron-icons.mjs"),
  ],
  {
    cwd: rootDir,
    stdio: "inherit",
  },
);

child.on("exit", (code) => {
  if (code !== 0) {
    process.exit(code ?? 1);
  }

  const buildChild = spawn(
    process.platform === "win32" ? "pnpm.cmd" : "pnpm",
    ["build:web"],
    {
      cwd: rootDir,
      stdio: "inherit",
    },
  );

  buildChild.on("exit", (buildCode) => {
    if (buildCode !== 0) {
      process.exit(buildCode ?? 1);
    }

    const bundleChild = spawn(
      process.execPath,
      [path.join(rootDir, "scripts", "prepare-electron-bundle.mjs")],
      {
        cwd: rootDir,
        stdio: "inherit",
      },
    );

    bundleChild.on("exit", (bundleCode) => {
      if (bundleCode !== 0) {
        process.exit(bundleCode ?? 1);
      }

      console.log(`Building ${config.label} installer for ${resolvedArch}...`);

      const installerChild = spawn(electronBuilderBinary, builderArgs, {
        cwd: rootDir,
        stdio: "inherit",
      });

      installerChild.on("exit", (installerCode) => {
        process.exit(installerCode ?? 0);
      });
    });
  });
});
