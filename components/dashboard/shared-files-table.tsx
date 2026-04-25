"use client";

import { useMemo, useState } from "react";
import { Download, Eye, MoreVertical, Search } from "lucide-react";
import { useRouter } from "next/navigation";

import type { SharedFileListItem } from "@/lib/data";
import { formatReportDateTime, formatReportSize } from "@/lib/utils";
import { SharedFileViewerDialog } from "@/components/dashboard/shared-file-viewer-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type SharedFilesTableProps = {
  files: SharedFileListItem[];
};

export function SharedFilesTable({ files }: SharedFilesTableProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [viewingFile, setViewingFile] = useState<SharedFileListItem | null>(null);

  const visibleFiles = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return files.filter((file) => {
      if (!normalizedQuery) {
        return true;
      }

      return [file.title, file.fileName, file.senderName].some((value) => value.toLowerCase().includes(normalizedQuery));
    });
  }, [files, query]);

  return (
    <Card className="border-border/70 bg-card shadow-sm">
      <CardHeader className="space-y-4">
        <div className="space-y-1">
          <CardTitle>Shared Files</CardTitle>
          <CardDescription>Files shared from other devices on your network will appear here.</CardDescription>
        </div>

        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="pl-9"
            placeholder="Search shared files..."
          />
        </div>
      </CardHeader>

      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Shared File</TableHead>
                <TableHead>From Device</TableHead>
                <TableHead>Received At</TableHead>
                <TableHead>Last Viewed At</TableHead>
                <TableHead className="w-[72px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleFiles.length > 0 ? (
                visibleFiles.map((file) => (
                  <TableRow key={file.id}>
                    <TableCell>
                      <div className="font-medium">{file.title}</div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {file.fileName} • {formatReportSize(file.size)}
                      </p>
                    </TableCell>
                    <TableCell>{file.senderName}</TableCell>
                    <TableCell>{formatReportDateTime(file.createdAt)}</TableCell>
                    <TableCell>{formatReportDateTime(file.lastViewedAt)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setViewingFile(file)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View document
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <a href={`/api/shared-files/${file.id}/download`} className="flex w-full items-center">
                              <Download className="mr-2 h-4 w-4" />
                              Download
                            </a>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                    {query.trim() ? "No shared files matched your search." : "No shared files have been received yet."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      <SharedFileViewerDialog
        open={Boolean(viewingFile)}
        onOpenChange={(open) => {
          if (!open) {
            setViewingFile(null);
          }
        }}
        file={viewingFile}
        onViewed={() => router.refresh()}
      />
    </Card>
  );
}
