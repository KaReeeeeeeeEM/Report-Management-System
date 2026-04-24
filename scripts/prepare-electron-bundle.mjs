import { cp, mkdir, readdir, rm } from "node:fs/promises";
import path from "node:path";

const rootDir = process.cwd();
const standaloneDir = path.join(rootDir, ".next", "standalone");
const staticDir = path.join(rootDir, ".next", "static");
const publicDir = path.join(rootDir, "public");
const bundleRoot = path.join(rootDir, "electron", "bundle");
const appBundleDir = path.join(bundleRoot, "app");
const rootNodeModulesDir = path.join(appBundleDir, "node_modules");
const pnpmStoreDir = path.join(rootNodeModulesDir, ".pnpm");

async function flattenStandaloneDependencies() {
  const storeEntries = await readdir(pnpmStoreDir, { withFileTypes: true });

  for (const storeEntry of storeEntries) {
    if (!storeEntry.isDirectory()) {
      continue;
    }

    const packageNodeModulesDir = path.join(pnpmStoreDir, storeEntry.name, "node_modules");

    try {
      const packageEntries = await readdir(packageNodeModulesDir, { withFileTypes: true });

      for (const packageEntry of packageEntries) {
        if (packageEntry.name.startsWith(".")) {
          continue;
        }

        if (packageEntry.name.startsWith("@")) {
          const scopeSourceDir = path.join(packageNodeModulesDir, packageEntry.name);
          const scopeTargetDir = path.join(rootNodeModulesDir, packageEntry.name);
          await mkdir(scopeTargetDir, { recursive: true });

          const scopedPackages = await readdir(scopeSourceDir, { withFileTypes: true });

          for (const scopedPackage of scopedPackages) {
            const scopedSourcePath = path.join(scopeSourceDir, scopedPackage.name);
            const scopedTargetPath = path.join(scopeTargetDir, scopedPackage.name);
            await cp(scopedSourcePath, scopedTargetPath, { recursive: true, dereference: true, force: false, errorOnExist: false });
          }

          continue;
        }

        const sourcePath = path.join(packageNodeModulesDir, packageEntry.name);
        const targetPath = path.join(rootNodeModulesDir, packageEntry.name);
        await cp(sourcePath, targetPath, { recursive: true, dereference: true, force: false, errorOnExist: false });
      }
    } catch {
      continue;
    }
  }
}

async function findPnpmPackageDir(packagePrefix) {
  const storeEntries = await readdir(pnpmStoreDir, { withFileTypes: true });
  const entry = storeEntries.find((item) => item.isDirectory() && item.name.startsWith(`${packagePrefix}@`));

  if (!entry) {
    return null;
  }

  return path.join(pnpmStoreDir, entry.name, "node_modules");
}

async function ensureMongoDriverDependencyVersions() {
  const mongodbStoreDir = await findPnpmPackageDir("mongodb");

  if (!mongodbStoreDir) {
    return;
  }

  const packagesToPin = [
    ["mongodb", path.join(mongodbStoreDir, "mongodb")],
    ["bson", path.join(mongodbStoreDir, "bson")],
    ["mongodb-connection-string-url", path.join(mongodbStoreDir, "mongodb-connection-string-url")],
    ["@mongodb-js/saslprep", path.join(mongodbStoreDir, "@mongodb-js", "saslprep")],
  ];

  for (const [packageName, sourcePath] of packagesToPin) {
    const targetPath = path.join(rootNodeModulesDir, packageName);

    await rm(targetPath, { recursive: true, force: true });

    if (packageName.startsWith("@")) {
      await mkdir(path.dirname(targetPath), { recursive: true });
    }

    await cp(sourcePath, targetPath, {
      recursive: true,
      dereference: true,
      force: true,
    });
  }
}

await rm(bundleRoot, { recursive: true, force: true });
await mkdir(appBundleDir, { recursive: true });

await cp(standaloneDir, appBundleDir, {
  recursive: true,
  dereference: true,
});

await cp(staticDir, path.join(appBundleDir, ".next", "static"), {
  recursive: true,
});

await cp(publicDir, path.join(appBundleDir, "public"), {
  recursive: true,
});

await flattenStandaloneDependencies();
await ensureMongoDriverDependencyVersions();

await rm(path.join(appBundleDir, ".env"), { force: true });
await rm(path.join(appBundleDir, "storage"), { recursive: true, force: true });
