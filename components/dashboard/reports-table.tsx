"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { MoreVertical, Pencil, RotateCcw, Trash2, Eye, Download, Plus, Search, ArrowUpDown, Share2 } from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

import type { ReportListItem } from "@/lib/data";
import { formatReportDate, formatReportDateTime, formatReportSize } from "@/lib/utils";
import { ConfirmActionDialog } from "@/components/dashboard/confirm-action-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { NetworkShareDialog } from "@/components/dashboard/network-share-dialog";

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
  const [sharingReport, setSharingReport] = useState<ReportListItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ReportListItem | null>(null);
  const [permanentDeleteTarget, setPermanentDeleteTarget] = useState<ReportListItem | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkAction, setBulkAction] = useState<"restore" | "delete" | null>(null);
  const [selectedReportIds, setSelectedReportIds] = useState<string[]>([]);
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

  useEffect(() => {
    setSelectedReportIds((currentSelection) => currentSelection.filter((reportId) => reports.some((report) => report.id === reportId)));
  }, [reports]);

  const someVisibleSelected = deletedView && visibleReports.some((report) => selectedReportIds.includes(report.id));
  const allVisibleSelected =
    deletedView && visibleReports.length > 0 && visibleReports.every((report) => selectedReportIds.includes(report.id));
  const selectedReports = deletedView ? reports.filter((report) => selectedReportIds.includes(report.id)) : [];

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

  async function handleBulkRestore() {
    if (selectedReportIds.length === 0) return;

    setBulkAction("restore");

    const results = await Promise.all(
      selectedReportIds.map(async (reportId) => {
        const response = await fetch(`/api/reports/${reportId}/restore`, { method: "POST" });
        return response.ok;
      }),
    );

    setBulkAction(null);

    if (results.every(Boolean)) {
      toast.success("Selected reports restored successfully.");
      setSelectedReportIds([]);
      refreshData();
      return;
    }

    const restoredCount = results.filter(Boolean).length;

    if (restoredCount > 0) {
      toast.success(`${restoredCount} selected reports were restored.`);
      setSelectedReportIds((currentSelection) =>
        currentSelection.filter((reportId, index) => !results[index]),
      );
      refreshData();
      return;
    }

    toast.error("The selected reports could not be restored right now.");
  }

  async function handlePermanentDelete() {
    if (!permanentDeleteTarget) return;

    setBusyId(permanentDeleteTarget.id);
    const response = await fetch(`/api/reports/${permanentDeleteTarget.id}?permanent=true`, { method: "DELETE" });
    setBusyId(null);

    if (!response.ok) {
      toast.error("That report could not be permanently deleted right now.");
      return;
    }

    toast.success("Report permanently deleted.");
    setPermanentDeleteTarget(null);
    refreshData();
  }

  async function handleBulkPermanentDelete() {
    if (selectedReportIds.length === 0) return;

    setBulkAction("delete");

    const results = await Promise.all(
      selectedReportIds.map(async (reportId) => {
        const response = await fetch(`/api/reports/${reportId}?permanent=true`, { method: "DELETE" });
        return response.ok;
      }),
    );

    setBulkAction(null);
    setBulkDeleteOpen(false);

    if (results.every(Boolean)) {
      toast.success("Selected reports permanently deleted.");
      setSelectedReportIds([]);
      refreshData();
      return;
    }

    const deletedCount = results.filter(Boolean).length;

    if (deletedCount > 0) {
      toast.success(`${deletedCount} selected reports were permanently deleted.`);
      setSelectedReportIds((currentSelection) =>
        currentSelection.filter((reportId, index) => !results[index]),
      );
      refreshData();
      return;
    }

    toast.error("The selected reports could not be permanently deleted right now.");
  }

  function toggleReportSelection(reportId: string, checked: boolean) {
    setSelectedReportIds((currentSelection) =>
      checked ? Array.from(new Set([...currentSelection, reportId])) : currentSelection.filter((id) => id !== reportId),
    );
  }

  function toggleAllVisibleReports(checked: boolean) {
    if (!checked) {
      setSelectedReportIds((currentSelection) =>
        currentSelection.filter((reportId) => !visibleReports.some((report) => report.id === reportId)),
      );
      return;
    }

    setSelectedReportIds((currentSelection) =>
      Array.from(new Set([...currentSelection, ...visibleReports.map((report) => report.id)])),
    );
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

          {deletedView ? (
            <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium">
                  {selectedReportIds.length > 0 ? `${selectedReportIds.length} selected` : "Select reports"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Choose the recycle-bin records you want to recover or permanently delete.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void handleBulkRestore()}
                  disabled={selectedReportIds.length === 0 || busyId !== null || bulkAction !== null}
                >
                  <RotateCcw className="h-4 w-4" />
                  Recover selected
                </Button>
                <Button
                  size="sm"
                  onClick={() => setBulkDeleteOpen(true)}
                  disabled={selectedReportIds.length === 0 || busyId !== null || bulkAction !== null}
                  className="bg-red-600 text-white hover:bg-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete selected
                </Button>
              </div>
            </div>
          ) : null}
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto" data-tour={deletedView ? "recycle-table" : title === "Latest Reports" ? "overview-latest-reports" : "reports-table"}>
            <Table>
              <TableHeader>
                <TableRow>
                  {deletedView ? (
                    <TableHead className="w-[56px]">
                      <Checkbox
                        aria-label="Select all recycle bin reports"
                        checked={allVisibleSelected ? true : someVisibleSelected ? "indeterminate" : false}
                        onCheckedChange={(checked) => toggleAllVisibleReports(checked === true)}
                      />
                    </TableHead>
                  ) : null}
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
                      {deletedView ? (
                        <TableCell className="w-[56px]">
                          <Checkbox
                            aria-label={`Select ${report.title}`}
                            checked={selectedReportIds.includes(report.id)}
                            onCheckedChange={(checked) => toggleReportSelection(report.id, checked === true)}
                          />
                        </TableCell>
                      ) : null}
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
                            {!deletedView ? (
                              <DropdownMenuItem onClick={() => setSharingReport(report)}>
                                <Share2 className="mr-2 h-4 w-4" />
                                Share file
                              </DropdownMenuItem>
                            ) : null}
                            <DropdownMenuSeparator />
                            {deletedView ? (
                              <>
                                <DropdownMenuItem onClick={() => handleRestore(report)}>
                                  <RotateCcw className="mr-2 h-4 w-4" />
                                  Recover report
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-red-500 focus:text-red-500"
                                  onClick={() => setPermanentDeleteTarget(report)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </>
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
                    <TableCell colSpan={deletedView ? 8 : 7} className="py-12 text-center text-muted-foreground">
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
      <NetworkShareDialog
        open={Boolean(sharingReport)}
        onOpenChange={(open) => {
          if (!open) setSharingReport(null);
        }}
        report={sharingReport}
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
      <ConfirmActionDialog
        open={Boolean(permanentDeleteTarget)}
        onOpenChange={(open) => {
          if (!open) setPermanentDeleteTarget(null);
        }}
        title="Delete report permanently?"
        description={
          permanentDeleteTarget
            ? `This will permanently delete "${permanentDeleteTarget.title}" and remove its PDF from storage.`
            : ""
        }
        confirmationLabel="Report title"
        confirmationText={permanentDeleteTarget?.title}
        confirmationHint="Copy the report title exactly as shown above, then type it here to confirm permanent deletion."
        confirmLabel="Delete permanently"
        confirmButtonClassName="bg-red-600 text-white hover:bg-red-700"
        pending={busyId === permanentDeleteTarget?.id}
        onConfirm={handlePermanentDelete}
      />
      <ConfirmActionDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        title="Delete selected reports permanently?"
        description={
          selectedReports.length > 0
            ? `${selectedReports.length} selected reports will be permanently deleted and removed from storage.`
            : ""
        }
        confirmationLabel="Confirmation"
        confirmationText={selectedReports.length > 0 ? "DELETE" : undefined}
        confirmationHint='Type "DELETE" to permanently remove all selected recycle-bin reports.'
        confirmLabel="Delete selected"
        confirmButtonClassName="bg-red-600 text-white hover:bg-red-700"
        pending={bulkAction === "delete"}
        onConfirm={handleBulkPermanentDelete}
      />
    </>
  );
}
