import { clsx, type ClassValue } from "clsx";
import { format, isValid } from "date-fns";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatReportDate(date: Date | string) {
  return format(new Date(date), "MMM d, yyyy");
}

export function formatReportDateTime(date: Date | string | null | undefined) {
  if (!date) return "Never";

  const parsed = new Date(date);
  if (!isValid(parsed)) return "Never";

  return format(parsed, "MMM d, yyyy • h:mm a");
}

export function formatReportSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function statusVariant(status: string): "default" | "secondary" | "outline" | "success" {
  const normalized = status.toLowerCase();

  if (normalized === "reviewed") return "success";
  if (normalized === "archived") return "secondary";
  return "outline";
}
