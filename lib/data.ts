import { Types } from "mongoose";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";

import { connectToDatabase } from "@/lib/db";
import { isDesktopEmbeddedMode, readDesktopDatabase, writeDesktopDatabase, type DesktopReportRecord } from "@/lib/desktop-db";
import { deleteStoredFile, ensureStorageDirectory, loadStoredFile, saveSeedFile, saveUploadedFile } from "@/lib/file-storage";
import { getAdminDefaults } from "@/lib/auth";
import { AdminModel } from "@/models/Admin";
import { ReportModel } from "@/models/Report";
import { formatReportSize } from "@/lib/utils";

export type ReportListItem = {
  id: string;
  reportDate: string;
  projectName: string;
  projectCoordinator: string;
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

const SAMPLE_REPORTS = [
  {
    reportDate: "2026-02-18",
    projectName: "Operations Revamp",
    projectCoordinator: "Lillian Msuya",
    title: "Quarterly Operations Summary",
    category: "Operations",
    status: "Reviewed",
    fileName: "quarterly-operations-summary.pdf",
    content: "Quarterly operations summary for the report management system demo build.",
  },
  {
    reportDate: "2026-03-06",
    projectName: "Governance Review",
    projectCoordinator: "Kelvin Mushi",
    title: "Compliance Checklist",
    category: "Compliance",
    status: "Pending Review",
    fileName: "compliance-checklist.pdf",
    content: "Compliance notes and outstanding review items.",
  },
  {
    reportDate: "2026-04-10",
    projectName: "Risk Monitoring",
    projectCoordinator: "Rehema Kweka",
    title: "Risk Assessment",
    category: "Risk",
    status: "Archived",
    fileName: "risk-assessment.pdf",
    content: "Risk assessment report archived for audit reference.",
  },
];

type ReportDocument = {
  _id: Types.ObjectId | string;
  reportDate: Date | string;
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
  createdAt: Date | string;
  lastViewedAt: Date | string | null;
  isDeleted: boolean;
};

function buildPdfBuffer(title: string, content: string) {
  const escapePdfText = (value: string) => value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  const safeTitle = escapePdfText(title);
  const safeContent = escapePdfText(content);
  const stream = `BT
/F1 20 Tf
72 730 Td
(${safeTitle}) Tj
0 -34 Td
/F1 12 Tf
(${safeContent}) Tj
ET`;

  const objects = [
    `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`,
    `2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n`,
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n`,
    `4 0 obj\n<< /Length ${Buffer.byteLength(stream, "utf8")} >>\nstream\n${stream}\nendstream\nendobj\n`,
    `5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];

  objects.forEach((object) => {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += object;
  });

  const startXref = Buffer.byteLength(pdf, "utf8");
  pdf += `xref
0 ${objects.length + 1}
0000000000 65535 f 
${offsets.map((offset) => `${offset.toString().padStart(10, "0")} 00000 n `).join("\n")}
trailer
<< /Size ${objects.length + 1} /Root 1 0 R >>
startxref
${startXref}
%%EOF`;

  return Buffer.from(pdf, "utf8");
}

function normalizeReport(report: ReportDocument): ReportListItem {
  const createdAt = report.createdAt ? new Date(report.createdAt) : new Date();
  const reportDate = report.reportDate ? new Date(report.reportDate) : createdAt;

  return {
    id: typeof report._id === "string" ? report._id : report._id.toString(),
    reportDate: reportDate.toISOString(),
    projectName: report.projectName ?? report.category ?? "General Project",
    projectCoordinator: report.projectCoordinator ?? "Unknown Coordinator",
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

function isPdfFile(file: File) {
  const fileName = file.name.toLowerCase();
  return fileName.endsWith(".pdf") && (file.type === "application/pdf" || file.type === "" || file.type === "application/octet-stream");
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

  if (!isPdfFile(value)) {
    throw new Error("Only PDF files are allowed.");
  }

  return value;
}

export async function ensureSeedData() {
  if (isDesktopEmbeddedMode()) {
    await ensureStorageDirectory();

    const database = await readDesktopDatabase();
    const defaults = getAdminDefaults();
    let changed = false;

    const admin = database.admins.find((item) => item.email === defaults.email);

    if (!admin) {
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
    } else {
      const passwordMatches = await bcrypt.compare(defaults.password, admin.passwordHash);

      if (admin.name !== defaults.name || !passwordMatches) {
        admin.name = defaults.name;
        admin.updatedAt = new Date().toISOString();

        if (!passwordMatches) {
          admin.passwordHash = await bcrypt.hash(defaults.password, 10);
        }

        changed = true;
      }
    }

    database.reports = database.reports.map((report) => ({
      ...report,
      isDeleted: report.isDeleted ?? false,
      lastViewedAt: report.lastViewedAt ?? null,
    }));

    if (database.reports.length === 0) {
      const reports = await Promise.all(
        SAMPLE_REPORTS.map(async (report, index) => {
          const pdfBuffer = buildPdfBuffer(report.title, report.content);
          const filePath = await saveSeedFile(report.fileName, pdfBuffer);
          const createdAt = new Date();
          createdAt.setMonth(createdAt.getMonth() - (SAMPLE_REPORTS.length - index - 1));
          const createdAtIso = createdAt.toISOString();

          return {
            _id: randomUUID(),
            reportDate: new Date(report.reportDate).toISOString(),
            projectName: report.projectName,
            projectCoordinator: report.projectCoordinator,
            title: report.title,
            category: report.category,
            status: report.status,
            fileName: report.fileName,
            filePath,
            mimeType: "application/pdf",
            size: pdfBuffer.length,
            uploadedBy: defaults.email,
            lastViewedAt: null,
            isDeleted: false,
            createdAt: createdAtIso,
            updatedAt: createdAtIso,
          } satisfies DesktopReportRecord;
        }),
      );

      database.reports = reports;
      changed = true;
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
  } else {
    const needsNameUpdate = existingAdmin.name !== defaults.name;
    const passwordMatches = await bcrypt.compare(defaults.password, existingAdmin.passwordHash);

    if (needsNameUpdate || !passwordMatches) {
      existingAdmin.name = defaults.name;

      if (!passwordMatches) {
        existingAdmin.passwordHash = await bcrypt.hash(defaults.password, 10);
      }

      await existingAdmin.save();
    }
  }

  await ReportModel.updateMany({ isDeleted: { $exists: false } }, { $set: { isDeleted: false } });
  await ReportModel.updateMany({ lastViewedAt: { $exists: false } }, { $set: { lastViewedAt: null } });

  const reportCount = await ReportModel.countDocuments();

  if (reportCount === 0) {
    const docs = await Promise.all(
      SAMPLE_REPORTS.map(async (report, index) => {
        const pdfBuffer = buildPdfBuffer(report.title, report.content);
        const filePath = await saveSeedFile(report.fileName, pdfBuffer);
        const createdAt = new Date();
        createdAt.setMonth(createdAt.getMonth() - (SAMPLE_REPORTS.length - index - 1));

        return {
          reportDate: new Date(report.reportDate),
          projectName: report.projectName,
          projectCoordinator: report.projectCoordinator,
          title: report.title,
          category: report.category,
          status: report.status,
          fileName: report.fileName,
          filePath,
          mimeType: "application/pdf",
          size: pdfBuffer.length,
          uploadedBy: defaults.email,
          lastViewedAt: null,
          isDeleted: false,
          createdAt,
          updatedAt: createdAt,
        };
      }),
    );

    await ReportModel.insertMany(docs);
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
  const title = requireTextField(formData, "title", "Report title");
  const file = parseOptionalFile(formData);

  if (!file) {
    throw new Error("A PDF report is required.");
  }

  const storedFile = await saveUploadedFile(file);

  if (isDesktopEmbeddedMode()) {
    const database = await readDesktopDatabase();
    const now = new Date().toISOString();
    const report: DesktopReportRecord = {
      _id: randomUUID(),
      reportDate: new Date(reportDate).toISOString(),
      projectName,
      projectCoordinator,
      title,
      category: "Reports",
      status: "Pending Review",
      fileName: file.name,
      filePath: storedFile.filePath,
      mimeType: "application/pdf",
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
    title,
    category: "Reports",
    status: "Pending Review",
    fileName: file.name,
    filePath: storedFile.filePath,
    mimeType: "application/pdf",
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
    const title = requireTextField(formData, "title", "Report title");
    const replacementFile = parseOptionalFile(formData);

    report.reportDate = new Date(reportDate).toISOString();
    report.projectName = projectName;
    report.projectCoordinator = projectCoordinator;
    report.title = title;
    report.updatedAt = new Date().toISOString();

    if (replacementFile) {
      const storedFile = await saveUploadedFile(replacementFile);
      const previousPath = report.filePath;

      report.fileName = replacementFile.name;
      report.filePath = storedFile.filePath;
      report.mimeType = "application/pdf";
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
  const title = requireTextField(formData, "title", "Report title");
  const replacementFile = parseOptionalFile(formData);

  report.reportDate = new Date(reportDate);
  report.projectName = projectName;
  report.projectCoordinator = projectCoordinator;
  report.title = title;

  if (replacementFile) {
    const storedFile = await saveUploadedFile(replacementFile);
    const previousPath = report.filePath;

    report.fileName = replacementFile.name;
    report.filePath = storedFile.filePath;
    report.mimeType = "application/pdf";
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
