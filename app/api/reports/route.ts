import { NextResponse } from "next/server";

import { requireApiSession } from "@/lib/auth";
import { createReport } from "@/lib/data";

export async function POST(request: Request) {
  const session = await requireApiSession();
  const formData = await request.formData();

  try {
    const report = await createReport(formData, session.email);
    return NextResponse.json({ ok: true, report });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not upload report.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
