import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type DesktopAdminRecord = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
};

export type DesktopReportRecord = {
  _id: string;
  reportDate: string;
  projectName: string;
  projectCoordinator: string;
  title: string;
  category: string;
  status: string;
  fileName: string;
  filePath: string;
  size: number;
  mimeType: string;
  uploadedBy: string;
  createdAt: string;
  updatedAt: string;
  lastViewedAt: string | null;
  isDeleted: boolean;
};

export type DesktopSharedFileRecord = {
  id: string;
  title: string;
  fileName: string;
  filePath: string;
  size: number;
  mimeType: string;
  senderName: string;
  createdAt: string;
  updatedAt: string;
  lastViewedAt: string | null;
};

type DesktopDatabase = {
  admins: DesktopAdminRecord[];
  reports: DesktopReportRecord[];
  sharedFiles: DesktopSharedFileRecord[];
};

const EMPTY_DATABASE: DesktopDatabase = {
  admins: [],
  reports: [],
  sharedFiles: [],
};

function getDesktopDataRoot() {
  return process.env.DESKTOP_DATA_ROOT
    ? path.resolve(process.env.DESKTOP_DATA_ROOT)
    : path.join(process.cwd(), "storage");
}

function getDesktopDatabasePath() {
  return path.join(getDesktopDataRoot(), "desktop-db.json");
}

export function isDesktopEmbeddedMode() {
  return process.env.ELECTRON_EMBEDDED_DB === "true";
}

export async function readDesktopDatabase(): Promise<DesktopDatabase> {
  const filePath = getDesktopDatabasePath();
  await mkdir(path.dirname(filePath), { recursive: true });

  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as Partial<DesktopDatabase>;

    return {
      admins: Array.isArray(parsed.admins) ? parsed.admins : [],
      reports: Array.isArray(parsed.reports) ? parsed.reports : [],
      sharedFiles: Array.isArray(parsed.sharedFiles) ? parsed.sharedFiles : [],
    };
  } catch {
    return { ...EMPTY_DATABASE };
  }
}

export async function writeDesktopDatabase(database: DesktopDatabase) {
  const filePath = getDesktopDatabasePath();
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(database, null, 2), "utf8");
}
