import { NextResponse } from "next/server";

import { requireApiSession } from "@/lib/auth";
import { permanentlyDeleteReport, softDeleteReport, updateReport } from "@/lib/data";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  await requireApiSession();
  const { id } = await context.params;
  const formData = await request.formData();

  try {
    const report = await updateReport(id, formData);
    return NextResponse.json({ ok: true, report });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update report.";
    return NextResponse.json({ message }, { status: 400 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  await requireApiSession();
  const { id } = await context.params;
  const permanent = new URL(request.url).searchParams.get("permanent") === "true";

  try {
    const report = permanent ? await permanentlyDeleteReport(id) : await softDeleteReport(id);
    return NextResponse.json({ ok: true, report });
  } catch (error) {
    const message = error instanceof Error ? error.message : permanent ? "Could not permanently delete report." : "Could not delete report.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
