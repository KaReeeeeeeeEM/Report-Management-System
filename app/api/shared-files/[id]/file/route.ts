import { NextResponse } from "next/server";

import { requireApiSession } from "@/lib/auth";
import { getSharedFile } from "@/lib/data";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, context: RouteContext) {
  await requireApiSession();
  const { id } = await context.params;

  try {
    const file = await getSharedFile(id, { trackView: true });
    return new NextResponse(file.buffer, {
      status: 200,
      headers: {
        "Content-Type": file.mimeType,
        "Content-Disposition": `inline; filename="${file.fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "File not found.";
    return NextResponse.json({ message }, { status: 404 });
  }
}
