import { spawn } from "node:child_process";
import { cp, mkdir, readdir, rm } from "node:fs/promises";
import path from "node:path";

const rootDir = process.cwd();
const aggregateOutputDir = path.join(rootDir, "dist-installers");
const tempOutputRoot = path.join(rootDir, "dist-installers-work");
const electronBuilderBinary = path.join(
  rootDir,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "electron-builder.cmd" : "electron-builder",
);

const targets = [
  {
    name: "mac",
    arch: process.arch === "x64" ? "x64" : "arm64",
    builderArgs: ["--mac", "dmg"],
    artifactExtensions: new Set([".dmg"]),
  },
  {
    name: "win",
    arch: "x64",
    builderArgs: ["--win", "nsis", "zip"],
    artifactExtensions: new Set([".exe", ".zip"]),
  },
  {
    name: "linux",
    arch: "x64",
    builderArgs: ["--linux", "AppImage", "deb"],
    artifactExtensions: new Set([".AppImage", ".deb"]),
  },
];

async function runCommand(command, args, label) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: rootDir,
      stdio: "inherit",
      env: process.env,
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${label} exited with code ${code ?? "unknown"}.`));
    });

    child.on("error", reject);
  });
}

async function copyArtifacts(outputDir, target) {
  const entries = await readdir(outputDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }

    const extension = path.extname(entry.name);

    if (!target.artifactExtensions.has(extension)) {
      continue;
    }

    const sourcePath = path.join(outputDir, entry.name);
    const destinationPath = path.join(aggregateOutputDir, `${target.name}-${target.arch}-${entry.name}`);
    await cp(sourcePath, destinationPath, { force: true });
  }
}

console.log("Preparing shared desktop bundle...");
await rm(aggregateOutputDir, { recursive: true, force: true });
await rm(tempOutputRoot, { recursive: true, force: true });
await mkdir(aggregateOutputDir, { recursive: true });
await mkdir(tempOutputRoot, { recursive: true });

await runCommand(process.execPath, [path.join(rootDir, "scripts", "generate-electron-icons.mjs")], "generate-electron-icons");
await runCommand(process.platform === "win32" ? "pnpm.cmd" : "pnpm", ["build:web"], "pnpm build:web");
await runCommand(process.execPath, [path.join(rootDir, "scripts", "prepare-electron-bundle.mjs")], "prepare-electron-bundle");

for (const target of targets) {
  const outputDir = path.join(tempOutputRoot, `${target.name}-${target.arch}`);
  const builderArgs = [
    ...target.builderArgs,
    `--${target.arch}`,
    `--config.directories.output=${outputDir}`,
  ];

  console.log(`Building ${target.name} installer (${target.arch})...`);
  await runCommand(electronBuilderBinary, builderArgs, `electron-builder ${target.name}`);
  await copyArtifacts(outputDir, target);
}

console.log(`All installer artifacts were copied to ${aggregateOutputDir}`);
