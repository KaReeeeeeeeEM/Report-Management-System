import { Schema, model, models } from "mongoose";

const ReportSchema = new Schema(
  {
    reportDate: { type: Date, required: true },
    projectName: { type: String, required: true },
    projectCoordinator: { type: String, required: true },
    title: { type: String, required: true },
    category: { type: String, required: true },
    status: { type: String, required: true },
    fileName: { type: String, required: true },
    filePath: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    uploadedBy: { type: String, required: true },
    lastViewedAt: { type: Date, default: null },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const ReportModel = models.Report ?? model("Report", ReportSchema);
