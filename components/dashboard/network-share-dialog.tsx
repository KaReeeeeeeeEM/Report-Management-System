"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { LoaderCircle, Monitor, RefreshCcw, Send, Share2, Smartphone, Wifi } from "lucide-react";
import toast from "react-hot-toast";

import type { ReportListItem } from "@/lib/data";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type NetworkShareDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: ReportListItem | null;
};

export function NetworkShareDialog({ open, onOpenChange, report }: NetworkShareDialogProps) {
  const isDesktop = typeof window !== "undefined" && Boolean(window.desktopApp?.isDesktop);
  const supportsWebShare =
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function" &&
    typeof navigator.canShare === "function";
  const [devices, setDevices] = useState<
    Array<{ id: string; name: string; platform: string; address: string; transferPort: number; lastSeenAt: number }>
  >([]);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [sharingDeviceId, setSharingDeviceId] = useState<string | null>(null);
  const [sharingInBrowser, setSharingInBrowser] = useState(false);

  const loadDevices = useCallback(async () => {
    if (!window.desktopApp?.isDesktop || !open) {
      return;
    }

    setLoadingDevices(true);

    try {
      const networkDevices = await window.desktopApp.listNetworkDevices();
      setDevices(networkDevices);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load devices on your network.");
    } finally {
      setLoadingDevices(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !isDesktop) {
      return;
    }

    void loadDevices();
  }, [isDesktop, loadDevices, open]);

  const dialogDescription = useMemo(() => {
    if (!report) {
      return isDesktop
        ? "Choose a device on your network to receive this report."
        : "Share this report from your browser using the native share sheet when supported.";
    }

    return isDesktop
      ? `Choose a device on your network to receive "${report.title}".`
      : `Share "${report.title}" from your browser using the native share sheet when supported.`;
  }, [isDesktop, report]);

  async function handleShare(deviceId: string) {
    if (!report || !window.desktopApp?.isDesktop) {
      return;
    }

    setSharingDeviceId(deviceId);

    try {
      const response = await fetch(`/api/reports/${report.id}/download`);

      if (!response.ok) {
        throw new Error("The report file could not be loaded.");
      }

      const fileBytes = new Uint8Array(await response.arrayBuffer());

      await window.desktopApp.shareFile({
        deviceId,
        fileName: report.fileName,
        mimeType: response.headers.get("content-type") || report.mimeType || "application/pdf",
        reportTitle: report.title,
        data: fileBytes,
      });

      toast.success(`"${report.title}" was shared successfully.`);
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not share that report right now.");
    } finally {
      setSharingDeviceId(null);
    }
  }

  async function handleWebShare() {
    if (!report || !supportsWebShare) {
      return;
    }

    setSharingInBrowser(true);

    try {
      const response = await fetch(`/api/reports/${report.id}/download`);

      if (!response.ok) {
        throw new Error("The report file could not be loaded.");
      }

      const mimeType = response.headers.get("content-type") || report.mimeType || "application/pdf";
      const fileBuffer = await response.arrayBuffer();
      const file = new File([fileBuffer], report.fileName, {
        type: mimeType,
      });

      if (!navigator.canShare({ files: [file] })) {
        throw new Error("This browser cannot share PDF files from the web app.");
      }

      await navigator.share({
        files: [file],
        title: report.title,
        text: `Shared from Report Management System: ${report.title}`,
      });

      toast.success(`"${report.title}" was shared successfully.`);
      onOpenChange(false);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setSharingInBrowser(false);
        return;
      }

      toast.error(error instanceof Error ? error.message : "Could not share that report right now.");
    } finally {
      setSharingInBrowser(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share file
          </DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>

        {!isDesktop ? (
          <div className="min-h-0 space-y-4 overflow-y-auto pr-1">
            <div className="rounded-lg border border-border bg-muted/20 p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-background text-muted-foreground">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Browser share</p>
                  <p className="text-sm text-muted-foreground">
                    Use the browser or operating system share sheet to send the PDF to another app, contact, or nearby device.
                  </p>
                </div>
              </div>

              <div className="mt-4">
                <Button onClick={() => void handleWebShare()} disabled={!supportsWebShare || sharingInBrowser} className="w-full sm:w-auto">
                  {sharingInBrowser ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
                  Open share sheet
                </Button>
              </div>
            </div>

            <div className="rounded-lg border border-dashed border-border bg-muted/20 p-5 text-sm text-muted-foreground">
              {supportsWebShare
                ? "Device-by-device local network discovery is available in the desktop app. In the web app, sharing uses the browser's native share targets."
                : "This browser does not support file sharing from the web app. Device-by-device local network discovery is available in the desktop app."}
            </div>
          </div>
        ) : (
          <div className="flex min-h-0 flex-col gap-4 overflow-hidden">
            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-4 py-3">
              <div className="flex items-center gap-3">
                <Wifi className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Available devices</p>
                  <p className="text-xs text-muted-foreground">Devices are discovered from the current local network.</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => void loadDevices()} disabled={loadingDevices || Boolean(sharingDeviceId)}>
                {loadingDevices ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                Refresh
              </Button>
            </div>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
              {devices.length > 0 ? (
                devices.map((device) => (
                  <div
                    key={device.id}
                    className="flex items-center justify-between gap-4 rounded-lg border border-border bg-background px-4 py-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                          <Monitor className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{device.name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {device.address} • {device.platform}
                          </p>
                        </div>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => void handleShare(device.id)}
                      disabled={loadingDevices || Boolean(sharingDeviceId)}
                    >
                      {sharingDeviceId === device.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      Share
                    </Button>
                  </div>
                ))
              ) : (
                <div className="rounded-lg border border-dashed border-border bg-muted/20 px-6 py-10 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <Monitor className="h-5 w-5" />
                  </div>
                  <p className="mt-4 text-sm font-medium">No devices found</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Open the desktop app on another device connected to the same network, then refresh this list.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={Boolean(sharingDeviceId)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
