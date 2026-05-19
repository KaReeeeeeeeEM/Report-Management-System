import { Types } from "mongoose";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";

import { connectToDatabase } from "@/lib/db";
import {
  isDesktopEmbeddedMode,
  readDesktopDatabase,
  writeDesktopDatabase,
  type DesktopReportRecord,
  type DesktopSharedFileRecord,
} from "@/lib/desktop-db";
import { deleteStoredFile, ensureStorageDirectory, loadStoredFile, saveBufferFile, saveUploadedFile } from "@/lib/file-storage";
import { getAdminDefaults } from "@/lib/auth";
import { requiresDesktopSetup } from "@/lib/desktop-setup";
import { AdminModel } from "@/models/Admin";
import { ReportModel } from "@/models/Report";
import { formatReportSize } from "@/lib/utils";

export type ReportListItem = {
  id: string;
  reportDate: string;
  projectName: string;
  projectCoordinator: string;
  supervisor: string;
  title: string;
  category: string;
  status: string;
  fileName: string;
  size: number;
  mimeType: string;
  uploadedBy: string;
  createdAt: string;
  lastViewedAt: string | null;
  isDeleted: boolean;
};

export type SharedFileListItem = {
  id: string;
  title: string;
  fileName: string;
  size: number;
  mimeType: string;
  senderName: string;
  createdAt: string;
  lastViewedAt: string | null;
};

type DashboardSnapshot = {
  metrics: {
    totalReports: number;
    reviewedReports: number;
    thisMonthUploads: number;
    monthlyGrowth: number;
    reviewRate: number;
    totalStorageLabel: string;
  };
  monthlyTrend: Array<{ month: string; reports: number }>;
  statusBreakdown: Array<{ status: string; count: number }>;
  recentReports: ReportListItem[];
};

type ReportDocument = {
  _id: Types.ObjectId | string;
  reportDate: Date | string;
  projectName: string;
  projectCoordinator: string;
  supervisor?: string;
  title: string;
  category: string;
  status: string;
  fileName: string;
  filePath: string;
  size: number;
  mimeType: string;
  uploadedBy: string;
  createdAt: Date | string;
  lastViewedAt: Date | string | null;
  isDeleted: boolean;
};

const SAMPLE_REPORT_SIGNATURES = [
  {
    reportDate: "2026-02-18",
    projectName: "Operations Revamp",
    projectCoordinator: "Lillian Msuya",
    title: "Quarterly Operations Summary",
    category: "Operations",
    status: "Reviewed",
    fileName: "quarterly-operations-summary.pdf",
  },
  {
    reportDate: "2026-03-06",
    projectName: "Governance Review",
    projectCoordinator: "Kelvin Mushi",
    title: "Compliance Checklist",
    category: "Compliance",
    status: "Pending Review",
    fileName: "compliance-checklist.pdf",
  },
  {
    reportDate: "2026-04-10",
    projectName: "Risk Monitoring",
    projectCoordinator: "Rehema Kweka",
    title: "Risk Assessment",
    category: "Risk",
    status: "Archived",
    fileName: "risk-assessment.pdf",
  },
] as const;

function normalizeReport(report: ReportDocument): ReportListItem {
  const createdAt = report.createdAt ? new Date(report.createdAt) : new Date();
  const reportDate = report.reportDate ? new Date(report.reportDate) : createdAt;

  return {
    id: typeof report._id === "string" ? report._id : report._id.toString(),
    reportDate: reportDate.toISOString(),
    projectName: report.projectName ?? report.category ?? "General Project",
    projectCoordinator: report.projectCoordinator ?? "Unknown Coordinator",
    supervisor: report.supervisor ?? "",
    title: report.title,
    category: report.category ?? "Reports",
    status: report.status ?? "Pending Review",
    fileName: report.fileName,
    size: report.size,
    mimeType: report.mimeType,
    uploadedBy: report.uploadedBy,
    createdAt: createdAt.toISOString(),
    lastViewedAt: report.lastViewedAt ? new Date(report.lastViewedAt).toISOString() : null,
    isDeleted: report.isDeleted ?? false,
  };
}

function isSampleReport(report: {
  reportDate?: Date | string;
  projectName?: string;
  projectCoordinator?: string;
  title?: string;
  category?: string;
  status?: string;
  fileName?: string;
}) {
  const normalizedDate = report.reportDate ? new Date(report.reportDate).toISOString().slice(0, 10) : "";

  return SAMPLE_REPORT_SIGNATURES.some((sample) => {
    return (
      normalizedDate === sample.reportDate &&
      report.projectName === sample.projectName &&
      report.projectCoordinator === sample.projectCoordinator &&
      report.title === sample.title &&
      report.category === sample.category &&
      report.status === sample.status &&
      report.fileName === sample.fileName
    );
  });
}

function getMimeTypeFromFile(file: File) {
  if (file.type) {
    return file.type;
  }

  const extension = file.name.split(".").pop()?.toLowerCase();

  switch (extension) {
    case "pdf":
      return "application/pdf";
    case "doc":
      return "application/msword";
    case "docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    default:
      return "application/octet-stream";
  }
}

function normalizeSharedFile(file: DesktopSharedFileRecord): SharedFileListItem {
  return {
    id: file.id,
    title: file.title,
    fileName: file.fileName,
    size: file.size,
    mimeType: file.mimeType,
    senderName: file.senderName,
    createdAt: new Date(file.createdAt).toISOString(),
    lastViewedAt: file.lastViewedAt ? new Date(file.lastViewedAt).toISOString() : null,
  };
}

function requireTextField(formData: FormData, key: string, label: string) {
  const value = formData.get(key);
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} is required.`);
  }

  return value.trim();
}

function parseOptionalFile(formData: FormData) {
  const value = formData.get("file");
  if (!(value instanceof File) || value.size === 0) {
    return null;
  }

  return value;
}

export async function ensureSeedData() {
  if (isDesktopEmbeddedMode()) {
    await ensureStorageDirectory();

    const database = await readDesktopDatabase();
    const defaults = getAdminDefaults();
    const setupPending = await requiresDesktopSetup();
    let changed = false;

    if (!setupPending && database.admins.length === 0) {
      const now = new Date().toISOString();
      database.admins.push({
        id: randomUUID(),
        name: defaults.name,
        email: defaults.email,
        passwordHash: await bcrypt.hash(defaults.password, 10),
        createdAt: now,
        updatedAt: now,
      });
      changed = true;
    }

    database.reports = database.reports.map((report) => ({
      ...report,
      supervisor: report.supervisor ?? "",
      isDeleted: report.isDeleted ?? false,
      lastViewedAt: report.lastViewedAt ?? null,
    }));
    database.sharedFiles = (database.sharedFiles ?? []).map((sharedFile) => ({
      ...sharedFile,
      lastViewedAt: sharedFile.lastViewedAt ?? null,
    }));

    const retainedReports: DesktopReportRecord[] = [];
    const deletedFilePaths: string[] = [];

    database.reports.forEach((report) => {
      if (isSampleReport(report)) {
        deletedFilePaths.push(report.filePath);
        changed = true;
        return;
      }

      retainedReports.push(report);
    });

    if (retainedReports.length !== database.reports.length) {
      database.reports = retainedReports;
    }

    if (deletedFilePaths.length > 0) {
      changed = true;
      await Promise.all(deletedFilePaths.map((filePath) => deleteStoredFile(filePath)));
    }

    if (changed) {
      await writeDesktopDatabase(database);
    }

    return;
  }

  await connectToDatabase();
  await ensureStorageDirectory();

  const defaults = getAdminDefaults();
  const existingAdmin = await AdminModel.findOne({ email: defaults.email });

  if (!existingAdmin) {
    await AdminModel.create({
      name: defaults.name,
      email: defaults.email,
      passwordHash: await bcrypt.hash(defaults.password, 10),
    });
  }

  await ReportModel.updateMany({ isDeleted: { $exists: false } }, { $set: { isDeleted: false } });
  await ReportModel.updateMany({ lastViewedAt: { $exists: false } }, { $set: { lastViewedAt: null } });
  await ReportModel.updateMany({ supervisor: { $exists: false } }, { $set: { supervisor: "" } });

  const seededReports = await ReportModel.find().lean<Array<ReportDocument>>();
  const seededReportIds = seededReports.filter(isSampleReport).map((report) => report._id.toString());
  const seededFilePaths = seededReports.filter(isSampleReport).map((report) => report.filePath);

  if (seededReportIds.length > 0) {
    await ReportModel.deleteMany({ _id: { $in: seededReportIds } });
    await Promise.all(seededFilePaths.map((filePath) => deleteStoredFile(filePath)));
  }
}

export async function getAllReports(options?: { deleted?: boolean }): Promise<ReportListItem[]> {
  await ensureSeedData();
  const deleted = options?.deleted ?? false;

  if (isDesktopEmbeddedMode()) {
    const database = await readDesktopDatabase();

    return database.reports
      .filter((report) => report.isDeleted === deleted)
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
      .map((report) => normalizeReport(report));
  }

  const reports = await ReportModel.find()
    .where({ isDeleted: deleted })
    .sort({ createdAt: -1 })
    .lean<Array<ReportDocument>>();

  return reports.map(normalizeReport);
}

export async function getAllSharedFiles(): Promise<SharedFileListItem[]> {
  await ensureSeedData();

  if (!isDesktopEmbeddedMode()) {
    return [];
  }

  const database = await readDesktopDatabase();

  return database.sharedFiles
    .map(normalizeSharedFile)
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
}

export async function getDashboardSnapshot(): Promise<DashboardSnapshot> {
  const reports = await getAllReports({ deleted: false });
  const deletedReports = await getAllReports({ deleted: true });

  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();
  const lastMonthDate = new Date(thisYear, thisMonth - 1, 1);

  const thisMonthReports = reports.filter((report) => {
    const date = new Date(report.createdAt);
    return date.getMonth() === thisMonth && date.getFullYear() === thisYear;
  });

  const lastMonthReports = reports.filter((report) => {
    const date = new Date(report.createdAt);
    return date.getMonth() === lastMonthDate.getMonth() && date.getFullYear() === lastMonthDate.getFullYear();
  });

  const reviewedReports = reports.filter((report) => report.status.toLowerCase() === "reviewed").length;
  const totalSize = reports.reduce((sum, report) => sum + report.size, 0);
  const growthBase = lastMonthReports.length === 0 ? 1 : lastMonthReports.length;
  const monthlyGrowth = Math.round(((thisMonthReports.length - lastMonthReports.length) / growthBase) * 100);

  const monthlyMap = new Map<string, number>();
  for (let offset = 5; offset >= 0; offset -= 1) {
    const date = new Date(thisYear, thisMonth - offset, 1);
    const key = date.toLocaleString("en-US", { month: "short" });
    monthlyMap.set(key, 0);
  }

  reports.forEach((report) => {
    const monthLabel = new Date(report.createdAt).toLocaleString("en-US", { month: "short" });
    if (monthlyMap.has(monthLabel)) {
      monthlyMap.set(monthLabel, (monthlyMap.get(monthLabel) ?? 0) + 1);
    }
  });

  return {
    metrics: {
      totalReports: reports.length,
      reviewedReports,
      thisMonthUploads: thisMonthReports.length,
      monthlyGrowth,
      reviewRate: reports.length ? Math.round((reviewedReports / reports.length) * 100) : 0,
      totalStorageLabel: formatReportSize(totalSize),
    },
    monthlyTrend: Array.from(monthlyMap, ([month, reportsCount]) => ({ month, reports: reportsCount })),
    statusBreakdown: [
      { status: "Created", count: reports.length },
      { status: "Deleted", count: deletedReports.length },
    ],
    recentReports: reports,
  };
}

export async function createReport(formData: FormData, uploadedBy: string) {
  await ensureSeedData();

  const reportDate = requireTextField(formData, "reportDate", "Date");
  const projectName = requireTextField(formData, "projectName", "Project name");
  const projectCoordinator = requireTextField(formData, "projectCoordinator", "Project coordinator");
  const supervisor = requireTextField(formData, "supervisor", "Supervisor");
  const title = requireTextField(formData, "title", "Report title");
  const file = parseOptionalFile(formData);

  if (!file) {
    throw new Error("A report file is required.");
  }

  const storedFile = await saveUploadedFile(file);
  const mimeType = getMimeTypeFromFile(file);

  if (isDesktopEmbeddedMode()) {
    const database = await readDesktopDatabase();
    const now = new Date().toISOString();
    const report: DesktopReportRecord = {
      _id: randomUUID(),
      reportDate: new Date(reportDate).toISOString(),
      projectName,
      projectCoordinator,
      supervisor,
      title,
      category: "Reports",
      status: "Pending Review",
      fileName: file.name,
      filePath: storedFile.filePath,
      mimeType,
      size: file.size,
      uploadedBy,
      lastViewedAt: null,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    };

    database.reports.push(report);
    await writeDesktopDatabase(database);
    return normalizeReport(report);
  }

  const report = await ReportModel.create({
    reportDate: new Date(reportDate),
    projectName,
    projectCoordinator,
    supervisor,
    title,
    category: "Reports",
    status: "Pending Review",
    fileName: file.name,
    filePath: storedFile.filePath,
    mimeType,
    size: file.size,
    uploadedBy,
    lastViewedAt: null,
    isDeleted: false,
  });

  return normalizeReport(report.toObject() as ReportDocument);
}

export async function updateReport(id: string, formData: FormData) {
  await ensureSeedData();

  if (isDesktopEmbeddedMode()) {
    const database = await readDesktopDatabase();
    const report = database.reports.find((item) => item._id === id);

    if (!report) {
      throw new Error("Report not found.");
    }

    const reportDate = requireTextField(formData, "reportDate", "Date");
    const projectName = requireTextField(formData, "projectName", "Project name");
    const projectCoordinator = requireTextField(formData, "projectCoordinator", "Project coordinator");
    const supervisor = requireTextField(formData, "supervisor", "Supervisor");
    const title = requireTextField(formData, "title", "Report title");
    const replacementFile = parseOptionalFile(formData);

    report.reportDate = new Date(reportDate).toISOString();
    report.projectName = projectName;
    report.projectCoordinator = projectCoordinator;
    report.supervisor = supervisor;
    report.title = title;
    report.updatedAt = new Date().toISOString();

    if (replacementFile) {
      const storedFile = await saveUploadedFile(replacementFile);
      const previousPath = report.filePath;

      report.fileName = replacementFile.name;
      report.filePath = storedFile.filePath;
      report.mimeType = getMimeTypeFromFile(replacementFile);
      report.size = replacementFile.size;

      await deleteStoredFile(previousPath);
    }

    await writeDesktopDatabase(database);
    return normalizeReport(report);
  }

  const report = await ReportModel.findById(id);

  if (!report) {
    throw new Error("Report not found.");
  }

  const reportDate = requireTextField(formData, "reportDate", "Date");
  const projectName = requireTextField(formData, "projectName", "Project name");
  const projectCoordinator = requireTextField(formData, "projectCoordinator", "Project coordinator");
  const supervisor = requireTextField(formData, "supervisor", "Supervisor");
  const title = requireTextField(formData, "title", "Report title");
  const replacementFile = parseOptionalFile(formData);

  report.reportDate = new Date(reportDate);
  report.projectName = projectName;
  report.projectCoordinator = projectCoordinator;
  report.supervisor = supervisor;
  report.title = title;

  if (replacementFile) {
    const storedFile = await saveUploadedFile(replacementFile);
    const previousPath = report.filePath;

    report.fileName = replacementFile.name;
    report.filePath = storedFile.filePath;
    report.mimeType = getMimeTypeFromFile(replacementFile);
    report.size = replacementFile.size;

    await deleteStoredFile(previousPath);
  }

  await report.save();
  return normalizeReport(report.toObject() as ReportDocument);
}

export async function softDeleteReport(id: string) {
  await ensureSeedData();

  if (isDesktopEmbeddedMode()) {
    const database = await readDesktopDatabase();
    const report = database.reports.find((item) => item._id === id);

    if (!report) {
      throw new Error("Report not found.");
    }

    report.isDeleted = true;
    report.updatedAt = new Date().toISOString();
    await writeDesktopDatabase(database);
    return normalizeReport(report);
  }

  const report = await ReportModel.findByIdAndUpdate(id, { isDeleted: true }, { new: true }).lean<ReportDocument | null>();

  if (!report) {
    throw new Error("Report not found.");
  }

  return normalizeReport(report);
}

export async function restoreReport(id: string) {
  await ensureSeedData();

  if (isDesktopEmbeddedMode()) {
    const database = await readDesktopDatabase();
    const report = database.reports.find((item) => item._id === id);

    if (!report) {
      throw new Error("Report not found.");
    }

    report.isDeleted = false;
    report.updatedAt = new Date().toISOString();
    await writeDesktopDatabase(database);
    return normalizeReport(report);
  }

  const report = await ReportModel.findByIdAndUpdate(id, { isDeleted: false }, { new: true }).lean<ReportDocument | null>();

  if (!report) {
    throw new Error("Report not found.");
  }

  return normalizeReport(report);
}

export async function permanentlyDeleteReport(id: string) {
  await ensureSeedData();

  if (isDesktopEmbeddedMode()) {
    const database = await readDesktopDatabase();
    const reportIndex = database.reports.findIndex((item) => item._id === id);

    if (reportIndex === -1) {
      throw new Error("Report not found.");
    }

    const [report] = database.reports.splice(reportIndex, 1);
    await writeDesktopDatabase(database);
    await deleteStoredFile(report.filePath);
    return normalizeReport(report);
  }

  const report = await ReportModel.findByIdAndDelete(id).lean<ReportDocument | null>();

  if (!report) {
    throw new Error("Report not found.");
  }

  await deleteStoredFile(report.filePath);
  return normalizeReport(report);
}

export async function getReportFile(id: string, options?: { trackView?: boolean }) {
  await ensureSeedData();
  const trackView = options?.trackView ?? false;

  if (isDesktopEmbeddedMode()) {
    const database = await readDesktopDatabase();
    const report = database.reports.find((item) => item._id === id) ?? null;

    if (!report) {
      throw new Error("Report not found.");
    }

    if (trackView) {
      report.lastViewedAt = new Date().toISOString();
      report.updatedAt = new Date().toISOString();
      await writeDesktopDatabase(database);
    }

    const buffer = await loadStoredFile(report.filePath);
    return {
      buffer,
      mimeType: report.mimeType,
      fileName: report.fileName,
    };
  }

  let report: { filePath: string; mimeType: string; fileName: string } | null;

  if (trackView) {
    report = await ReportModel.findByIdAndUpdate(id, { lastViewedAt: new Date() }, { new: true }).lean<{
      filePath: string;
      mimeType: string;
      fileName: string;
    } | null>();
  } else {
    report = await ReportModel.findById(id).lean<{ filePath: string; mimeType: string; fileName: string } | null>();
  }

  if (!report) {
    throw new Error("Report not found.");
  }

  const buffer = await loadStoredFile(report.filePath);
  return {
    buffer,
    mimeType: report.mimeType,
    fileName: report.fileName,
  };
}

export async function getSharedFile(id: string, options?: { trackView?: boolean }) {
  await ensureSeedData();

  if (!isDesktopEmbeddedMode()) {
    throw new Error("Shared files are only available in the desktop app.");
  }

  const database = await readDesktopDatabase();
  const sharedFile = database.sharedFiles.find((item) => item.id === id) ?? null;

  if (!sharedFile) {
    throw new Error("Shared file not found.");
  }

  if (options?.trackView) {
    sharedFile.lastViewedAt = new Date().toISOString();
    sharedFile.updatedAt = new Date().toISOString();
    await writeDesktopDatabase(database);
  }

  const buffer = await loadStoredFile(sharedFile.filePath);

  return {
    buffer,
    mimeType: sharedFile.mimeType,
    fileName: sharedFile.fileName,
  };
}

export async function importDesktopSharedFile(payload: {
  fileName: string;
  reportTitle: string;
  senderName: string;
  mimeType: string;
  content: Buffer | Uint8Array | ArrayBuffer;
}) {
  await ensureSeedData();

  if (!isDesktopEmbeddedMode()) {
    throw new Error("Shared files can only be imported in the desktop app.");
  }

  const database = await readDesktopDatabase();
  const savedFile = await saveBufferFile(payload.fileName, payload.content);
  const now = new Date().toISOString();

  const sharedFileRecord: DesktopSharedFileRecord = {
    id: randomUUID(),
    title: payload.reportTitle,
    fileName: payload.fileName,
    filePath: savedFile.filePath,
    size: savedFile.buffer.length,
    mimeType: payload.mimeType,
    senderName: payload.senderName,
    createdAt: now,
    updatedAt: now,
    lastViewedAt: null,
  };

  database.sharedFiles.unshift(sharedFileRecord);
  await writeDesktopDatabase(database);

  return normalizeSharedFile(sharedFileRecord);
}

export async function getReportById(id: string) {
  await ensureSeedData();

  if (isDesktopEmbeddedMode()) {
    const database = await readDesktopDatabase();
    const report = database.reports.find((item) => item._id === id) ?? null;

    if (!report) {
      throw new Error("Report not found.");
    }

    return normalizeReport(report);
  }

  const report = await ReportModel.findById(id).lean<ReportDocument | null>();
  if (!report) {
    throw new Error("Report not found.");
  }

  return normalizeReport(report);
}
