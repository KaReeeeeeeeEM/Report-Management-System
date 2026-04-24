"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { format } from "date-fns";
import { LoaderCircle, Plus, Save } from "lucide-react";
import toast from "react-hot-toast";

import type { ReportListItem } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ReportFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  report?: ReportListItem | null;
  onSuccess: () => void;
};

export function ReportFormDialog({ open, onOpenChange, mode, report, onSuccess }: ReportFormDialogProps) {
  const [pending, setPending] = useState(false);
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [projectName, setProjectName] = useState("");
  const [projectCoordinator, setProjectCoordinator] = useState("");
  const [title, setTitle] = useState("");

  const dialogTitle = useMemo(() => (mode === "create" ? "New Report" : "Edit Report"), [mode]);

  useEffect(() => {
    if (!open) return;

    if (report) {
      setDate(new Date(report.reportDate));
      setProjectName(report.projectName);
      setProjectCoordinator(report.projectCoordinator);
      setTitle(report.title);
      return;
    }

    setDate(new Date());
    setProjectName("");
    setProjectCoordinator("");
    setTitle("");
  }, [open, report]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!date) {
      toast.error("Please choose a date.");
      return;
    }

    setPending(true);

    const formData = new FormData(event.currentTarget);
    formData.set("reportDate", format(date, "yyyy-MM-dd"));

    const endpoint = mode === "create" ? "/api/reports" : `/api/reports/${report?.id}`;
    const method = mode === "create" ? "POST" : "PATCH";

    const response = await fetch(endpoint, {
      method,
      body: formData,
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      toast.error(payload.message ?? "Something went wrong. Please try again.");
      setPending(false);
      return;
    }

    setPending(false);
    toast.success(mode === "create" ? "Report added successfully." : "Report updated successfully.");
    onOpenChange(false);
    onSuccess();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>
            Fill in the details below and attach the PDF you want to keep on the system.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label>Date</Label>
            <DatePicker value={date} onChange={setDate} placeholder="Choose a date" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="projectName">Project name</Label>
            <Input
              id="projectName"
              name="projectName"
              value={projectName}
              onChange={(event) => setProjectName(event.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="projectCoordinator">Project coordinator</Label>
            <Input
              id="projectCoordinator"
              name="projectCoordinator"
              value={projectCoordinator}
              onChange={(event) => setProjectCoordinator(event.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Report title</Label>
            <Input id="title" name="title" value={title} onChange={(event) => setTitle(event.target.value)} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="file">Report PDF</Label>
            <Input id="file" name="file" type="file" accept="application/pdf,.pdf" required={mode === "create"} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : mode === "create" ? (
                <Plus className="h-4 w-4" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {mode === "create" ? "Create report" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
