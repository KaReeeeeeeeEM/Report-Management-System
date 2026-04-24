import { rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";

await rm(".next", { recursive: true, force: true });

const nextBin = path.join(process.cwd(), "node_modules", "next", "dist", "bin", "next");

await new Promise((resolve, reject) => {
  const child = spawn(process.execPath, [nextBin, "build"], {
    env: process.env,
    stdio: "inherit",
  });

  child.on("exit", (code) => {
    if (code === 0) {
      resolve();
      return;
    }

    reject(new Error(`next build exited with code ${code ?? "unknown"}.`));
  });

  child.on("error", reject);
});
