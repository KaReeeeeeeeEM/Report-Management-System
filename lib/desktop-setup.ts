import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { isDesktopEmbeddedMode } from "@/lib/desktop-db";

export type DesktopSetupState = {
  completedAt: string | null;
  organizationName: string | null;
  deviceName: string | null;
  adminName: string | null;
  adminEmail: string | null;
  databaseMode: "desktop-embedded" | "local-mongodb";
};

const DEFAULT_SETUP_STATE: DesktopSetupState = {
  completedAt: null,
  organizationName: null,
  deviceName: null,
  adminName: null,
  adminEmail: null,
  databaseMode: "desktop-embedded",
};

function getDesktopDataRoot() {
  return process.env.DESKTOP_DATA_ROOT
    ? path.resolve(process.env.DESKTOP_DATA_ROOT)
    : path.join(process.cwd(), "storage");
}

function getDesktopSetupPath() {
  return path.join(getDesktopDataRoot(), "desktop-setup.json");
}

export async function readDesktopSetupState(): Promise<DesktopSetupState> {
  const filePath = getDesktopSetupPath();
  await mkdir(path.dirname(filePath), { recursive: true });

  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as Partial<DesktopSetupState>;

    return {
      completedAt: typeof parsed.completedAt === "string" ? parsed.completedAt : null,
      organizationName: typeof parsed.organizationName === "string" ? parsed.organizationName : null,
      deviceName: typeof parsed.deviceName === "string" ? parsed.deviceName : null,
      adminName: typeof parsed.adminName === "string" ? parsed.adminName : null,
      adminEmail: typeof parsed.adminEmail === "string" ? parsed.adminEmail : null,
      databaseMode: parsed.databaseMode === "local-mongodb" ? "local-mongodb" : "desktop-embedded",
    };
  } catch {
    return { ...DEFAULT_SETUP_STATE };
  }
}

export async function writeDesktopSetupState(state: DesktopSetupState) {
  const filePath = getDesktopSetupPath();
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(state, null, 2), "utf8");
}

export async function requiresDesktopSetup() {
  if (!isDesktopEmbeddedMode()) {
    return false;
  }

  const state = await readDesktopSetupState();
  return !state.completedAt;
}

export function getDefaultDeviceName() {
  return os.hostname() || "Workstation";
}
