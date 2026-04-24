"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function UploadReportForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const response = await fetch("/api/reports", {
      method: "POST",
      body: formData,
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(payload.message ?? "Upload failed.");
      setPending(false);
      return;
    }

    form.reset();
    setPending(false);
    router.refresh();
  }

  return (
    <Card className="border-border/70 bg-card shadow-sm">
      <CardHeader>
        <CardTitle>Upload report</CardTitle>
        <CardDescription>Add a new file and store its metadata in MongoDB.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="title">Report title</Label>
            <Input id="title" name="title" placeholder="Quarterly finance review" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Input id="category" name="category" placeholder="Finance" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Input id="status" name="status" defaultValue="Pending" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="file">File</Label>
            <Input id="file" name="file" type="file" required />
          </div>

          {error ? <p className="text-sm text-red-500">{error}</p> : null}

          <Button type="submit" disabled={pending}>
            {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Upload report
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
