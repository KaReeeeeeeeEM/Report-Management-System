import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const STORAGE_ROOT = process.env.REPORT_STORAGE_ROOT
  ? path.resolve(process.env.REPORT_STORAGE_ROOT)
  : path.join(process.cwd(), "storage", "reports");

export async function ensureStorageDirectory() {
  await mkdir(STORAGE_ROOT, { recursive: true });
  return STORAGE_ROOT;
}

export async function saveUploadedFile(file: File) {
  await ensureStorageDirectory();
  const ext = path.extname(file.name) || "";
  const fileName = `${Date.now()}-${randomUUID()}${ext}`;
  const filePath = path.join(STORAGE_ROOT, fileName);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);
  return { fileName, filePath, buffer };
}

export async function saveSeedFile(fileName: string, content: Buffer | string) {
  await ensureStorageDirectory();
  const filePath = path.join(STORAGE_ROOT, fileName);
  await writeFile(filePath, content);
  return filePath;
}

export async function loadStoredFile(filePath: string) {
  return readFile(filePath);
}

export async function deleteStoredFile(filePath: string) {
  await rm(filePath, { force: true });
}
