import { NextResponse } from "next/server";

import { requireApiSession } from "@/lib/auth";
import { restoreReport } from "@/lib/data";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_: Request, context: RouteContext) {
  await requireApiSession();
  const { id } = await context.params;

  try {
    const report = await restoreReport(id);
    return NextResponse.json({ ok: true, report });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not restore report.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
