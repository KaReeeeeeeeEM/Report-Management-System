import { NextResponse } from "next/server";

import { createSessionCookie, getAdminDefaults, verifyAdminCredentials } from "@/lib/auth";
import { ensureSeedData } from "@/lib/data";
import { requiresDesktopSetup } from "@/lib/desktop-setup";

export async function POST(request: Request) {
  if (await requiresDesktopSetup()) {
    return NextResponse.json({ message: "Complete desktop setup before signing in." }, { status: 409 });
  }

  await ensureSeedData();

  const body = await request.json().catch(() => null);
  const email = body?.email?.trim();
  const password = body?.password;

  if (!email || !password) {
    return NextResponse.json({ message: "Email and password are required." }, { status: 400 });
  }

  const admin = await verifyAdminCredentials(email, password);

  if (!admin) {
    return NextResponse.json({ message: "Invalid credentials." }, { status: 401 });
  }

  const defaults = getAdminDefaults();
  const response = NextResponse.json({
    ok: true,
    user: {
      email: admin.email,
      name: admin.name ?? defaults.name,
    },
  });

  response.cookies.set(await createSessionCookie(admin.email, admin.name ?? defaults.name));
  return response;
}
