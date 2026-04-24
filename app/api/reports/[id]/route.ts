import { NextResponse } from "next/server";

import { requireApiSession } from "@/lib/auth";
import { softDeleteReport, updateReport } from "@/lib/data";

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

export async function DELETE(_: Request, context: RouteContext) {
  await requireApiSession();
  const { id } = await context.params;

  try {
    const report = await softDeleteReport(id);
    return NextResponse.json({ ok: true, report });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not delete report.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
