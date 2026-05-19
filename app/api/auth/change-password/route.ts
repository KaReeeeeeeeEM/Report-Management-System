import { NextResponse } from "next/server";

import { ensureSeedData } from "@/lib/data";
import { requiresDesktopSetup } from "@/lib/desktop-setup";
import { updateAdminPassword, verifyAdminCredentials } from "@/lib/auth";

export async function POST(request: Request) {
  if (await requiresDesktopSetup()) {
    return NextResponse.json({ message: "Complete desktop setup before changing the password." }, { status: 409 });
  }

  await ensureSeedData();

  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const currentPassword = typeof body?.currentPassword === "string" ? body.currentPassword : "";
  const newPassword = typeof body?.newPassword === "string" ? body.newPassword : "";

  if (!email || !currentPassword || !newPassword) {
    return NextResponse.json({ message: "Email, current password, and new password are required." }, { status: 400 });
  }

  if (newPassword.length < 8) {
    return NextResponse.json({ message: "New password must be at least 8 characters." }, { status: 400 });
  }

  const admin = await verifyAdminCredentials(email, currentPassword);

  if (!admin) {
    return NextResponse.json({ message: "Current credentials could not be verified." }, { status: 401 });
  }

  try {
    await updateAdminPassword(email, newPassword);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not change password.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
