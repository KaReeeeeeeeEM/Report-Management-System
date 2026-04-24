"use client";

import { useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";

import type { ReportListItem } from "@/lib/data";
import { formatReportDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ReportViewerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: ReportListItem | null;
  onViewed: () => void;
};

export function ReportViewerDialog({ open, onOpenChange, report, onViewed }: ReportViewerDialogProps) {
  const fileUrl = useMemo(() => (report ? `/api/reports/${report.id}/file` : null), [report]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (open && fileUrl) {
      setIsLoading(true);
    }
  }, [fileUrl, open]);

  function handleOpenChange(nextOpen: boolean) {
    onOpenChange(nextOpen);
    if (!nextOpen && report) {
      onViewed();
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>{report?.title ?? "View Report"}</DialogTitle>
          <DialogDescription>
            Created {report ? formatReportDateTime(report.createdAt) : ""}. Last viewed{" "}
            {report ? formatReportDateTime(report.lastViewedAt) : "Never"}.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-4 py-3">
          <div className="text-sm text-muted-foreground">
            {report?.projectName} • {report?.projectCoordinator}
          </div>
          {report ? (
            <a href={`/api/reports/${report.id}/download`} className="inline-flex">
              <Button variant="outline">
                <Download className="h-4 w-4" />
                Download
              </Button>
            </a>
          ) : null}
        </div>

        <div className="relative overflow-hidden rounded-xl border border-border bg-muted/20">
          {fileUrl ? (
            <>
              {isLoading ? (
                <div className="absolute inset-0 z-10 h-[72vh] w-full bg-background p-6">
                  <div className="flex h-full flex-col gap-4 animate-pulse">
                    <div className="h-6 w-40 rounded-md bg-muted" />
                    <div className="h-4 w-64 rounded-md bg-muted" />
                    <div className="mt-2 flex-1 rounded-xl border border-border bg-card p-6">
                      <div className="mx-auto h-full max-w-3xl rounded-lg bg-muted/70" />
                    </div>
                  </div>
                </div>
              ) : null}
              <iframe
                key={fileUrl}
                src={fileUrl}
                title={report?.title ?? "PDF preview"}
                onLoad={() => setIsLoading(false)}
                className="h-[72vh] w-full bg-background"
              />
            </>
          ) : (
            <div className="flex h-[72vh] items-center justify-center text-sm text-muted-foreground">
              No document selected.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
