"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { MoreVertical, Pencil, RotateCcw, Trash2, Eye, Download, Plus, Search, ArrowUpDown } from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

import type { ReportListItem } from "@/lib/data";
import { formatReportDate, formatReportDateTime, formatReportSize } from "@/lib/utils";
import { ConfirmActionDialog } from "@/components/dashboard/confirm-action-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ReportFormDialog } from "@/components/dashboard/report-form-dialog";

const ReportViewerDialog = dynamic(
  () => import("@/components/dashboard/report-viewer-dialog").then((module) => module.ReportViewerDialog),
  { ssr: false },
);

type ReportsTableProps = {
  reports: ReportListItem[];
  title: string;
  description: string;
  allowCreate?: boolean;
  deletedView?: boolean;
  enableSearchAndSort?: boolean;
};

type SortField = "createdAt" | "lastViewedAt";
type SortDirection = "asc" | "desc";

export function ReportsTable({
  reports,
  title,
  description,
  allowCreate = false,
  deletedView = false,
  enableSearchAndSort = false,
}: ReportsTableProps) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<ReportListItem | null>(null);
  const [viewingReport, setViewingReport] = useState<ReportListItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ReportListItem | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const visibleReports = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    const filtered = reports.filter((report) => {
      if (!normalizedQuery) return true;

      return [
        report.title,
        report.projectName,
        report.projectCoordinator,
        report.fileName,
      ].some((value) => value.toLowerCase().includes(normalizedQuery));
    });

    return filtered.sort((left, right) => {
      const leftValue = sortField === "lastViewedAt" ? left.lastViewedAt ?? "" : left.createdAt;
      const rightValue = sortField === "lastViewedAt" ? right.lastViewedAt ?? "" : right.createdAt;

      const leftTime = leftValue ? new Date(leftValue).getTime() : 0;
      const rightTime = rightValue ? new Date(rightValue).getTime() : 0;
      const result = leftTime - rightTime;

      return sortDirection === "asc" ? result : -result;
    });
  }, [query, reports, sortDirection, sortField]);

  async function refreshData() {
    router.refresh();
  }

  async function handleDelete() {
    if (!deleteTarget) return;

    setBusyId(deleteTarget.id);
    const response = await fetch(`/api/reports/${deleteTarget.id}`, { method: "DELETE" });
    setBusyId(null);

    if (!response.ok) {
      toast.error("That report could not be moved right now.");
      return;
    }

    toast.success("Report moved to the recycle bin.");
    setDeleteTarget(null);
    refreshData();
  }

  async function handleRestore(report: ReportListItem) {
    setBusyId(report.id);
    const response = await fetch(`/api/reports/${report.id}/restore`, { method: "POST" });
    setBusyId(null);

    if (!response.ok) {
      toast.error("That report could not be restored right now.");
      return;
    }

    toast.success("Report restored successfully.");
    refreshData();
  }

  return (
    <>
      <Card className="border-border/70 bg-card shadow-sm">
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <CardTitle>{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>

            {allowCreate ? (
              <Button onClick={() => setCreateOpen(true)} data-tour="reports-create">
                <Plus className="h-4 w-4" />
                New Report
              </Button>
            ) : null}
          </div>

          {enableSearchAndSort ? (
            <div className="flex w-full items-center gap-3">
              <div className="relative max-w-md flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="pl-9"
                  placeholder="Search reports..."
                />
              </div>

              <div className="ml-auto flex justify-end">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                      <ArrowUpDown className="h-4 w-4" />
                      Sort by {sortField === "createdAt" ? "created date" : "last viewed"}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setSortField("createdAt")}>Date created</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortField("lastViewedAt")}>Last viewed</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setSortDirection("asc")}>Ascending</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortDirection("desc")}>Descending</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ) : null}
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto" data-tour={deletedView ? "recycle-table" : title === "Latest Reports" ? "overview-latest-reports" : "reports-table"}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Report Title</TableHead>
                  <TableHead>Project Name</TableHead>
                  <TableHead>Coordinator</TableHead>
                  <TableHead>Report Date</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead>Last Viewed At</TableHead>
                  <TableHead className="w-[72px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleReports.length > 0 ? (
                  visibleReports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell>
                        <div className="font-medium">{report.title}</div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {report.fileName} • {formatReportSize(report.size)}
                        </p>
                      </TableCell>
                      <TableCell>{report.projectName}</TableCell>
                      <TableCell>{report.projectCoordinator}</TableCell>
                      <TableCell>{formatReportDate(report.reportDate)}</TableCell>
                      <TableCell>{formatReportDateTime(report.createdAt)}</TableCell>
                      <TableCell>{formatReportDateTime(report.lastViewedAt)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={busyId === report.id}
                              data-tour={deletedView ? "recycle-actions" : "reports-actions"}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setViewingReport(report)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View document
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <a href={`/api/reports/${report.id}/download`} className="flex w-full items-center">
                                <Download className="mr-2 h-4 w-4" />
                                Download
                              </a>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {deletedView ? (
                              <DropdownMenuItem onClick={() => handleRestore(report)}>
                                <RotateCcw className="mr-2 h-4 w-4" />
                                Recover report
                              </DropdownMenuItem>
                            ) : (
                              <>
                                <DropdownMenuItem onClick={() => setEditingReport(report)}>
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Edit report
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-red-500 focus:text-red-500"
                                  onClick={() => setDeleteTarget(report)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete report
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                      {query.trim()
                        ? "No reports matched your search."
                        : deletedView
                          ? "Recycle bin is empty."
                          : "No reports available yet."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <ReportFormDialog open={createOpen} onOpenChange={setCreateOpen} mode="create" onSuccess={refreshData} />
      <ReportFormDialog
        open={Boolean(editingReport)}
        onOpenChange={(open) => {
          if (!open) setEditingReport(null);
        }}
        mode="edit"
        report={editingReport}
        onSuccess={() => {
          setEditingReport(null);
          refreshData();
        }}
      />
      <ReportViewerDialog
        open={Boolean(viewingReport)}
        onOpenChange={(open) => {
          if (!open) setViewingReport(null);
        }}
        report={viewingReport}
        onViewed={refreshData}
      />
      <ConfirmActionDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Move report to recycle bin?"
        description={
          deleteTarget
            ? `"${deleteTarget.title}" will be moved to the recycle bin and can be restored later.`
            : ""
        }
        confirmLabel="Move report"
        pending={busyId === deleteTarget?.id}
        onConfirm={handleDelete}
      />
    </>
  );
}
