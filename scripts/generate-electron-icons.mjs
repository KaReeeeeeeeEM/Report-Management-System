import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

const rootDir = process.cwd();
const sourceLogo = path.join(rootDir, "public", "logo.svg");
const iconsDir = path.join(rootDir, "electron", "icons");
const iconSetDir = path.join(iconsDir, "icon.iconset");
const pngPath = path.join(iconsDir, "logo.png");
const icnsPath = path.join(iconsDir, "icon.icns");
const copiedSvgPath = path.join(iconsDir, "logo.svg");

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} exited with code ${code ?? "unknown"}.`));
    });

    child.on("error", reject);
  });
}

await mkdir(iconsDir, { recursive: true });
await rm(iconSetDir, { recursive: true, force: true });
await cp(sourceLogo, copiedSvgPath);

await run("sips", ["-s", "format", "png", sourceLogo, "--out", pngPath]);
await mkdir(iconSetDir, { recursive: true });

const iconSizes = [16, 32, 128, 256, 512];

for (const size of iconSizes) {
  const standardPath = path.join(iconSetDir, `icon_${size}x${size}.png`);
  const retinaPath = path.join(iconSetDir, `icon_${size}x${size}@2x.png`);

  await run("sips", ["-z", `${size}`, `${size}`, pngPath, "--out", standardPath]);
  await run("sips", ["-z", `${size * 2}`, `${size * 2}`, pngPath, "--out", retinaPath]);
}

await run("iconutil", ["-c", "icns", iconSetDir, "-o", icnsPath]);
