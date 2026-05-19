import { NextResponse } from "next/server";

import { ensureSeedData } from "@/lib/data";
import { isDesktopEmbeddedMode } from "@/lib/desktop-db";
import { getCurrentDeviceRecoveryIdentity, readDesktopSetupState, requiresDesktopSetup } from "@/lib/desktop-setup";
import { updateAdminPassword } from "@/lib/auth";

function normalizeValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeRecoveryToken(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

export async function POST(request: Request) {
  if (!isDesktopEmbeddedMode()) {
    return NextResponse.json(
      { message: "Offline password recovery is only available in the desktop installation." },
      { status: 400 },
    );
  }

  if (await requiresDesktopSetup()) {
    return NextResponse.json({ message: "Complete desktop setup before recovering a password." }, { status: 409 });
  }

  await ensureSeedData();

  const body = await request.json().catch(() => null);
  const email = normalizeValue(body?.email).toLowerCase();
  const accountUsername = normalizeValue(body?.accountUsername);
  const newPassword = typeof body?.newPassword === "string" ? body.newPassword : "";

  if (!email || !accountUsername || !newPassword) {
    return NextResponse.json(
      { message: "Email, local computer account username, and new password are required." },
      { status: 400 },
    );
  }

  if (newPassword.length < 8) {
    return NextResponse.json({ message: "New password must be at least 8 characters." }, { status: 400 });
  }

  const [setupState, recoveryIdentity] = await Promise.all([readDesktopSetupState(), Promise.resolve(getCurrentDeviceRecoveryIdentity())]);
  const expectedHostName = setupState.registeredHostName ?? recoveryIdentity.hostName;
  const expectedAccountUsername = setupState.registeredAccountUsername ?? recoveryIdentity.accountUsername;

  if ((setupState.adminEmail ?? "").toLowerCase() !== email) {
    return NextResponse.json({ message: "That email does not match the registered admin for this device." }, { status: 401 });
  }

  if (normalizeRecoveryToken(recoveryIdentity.hostName) !== normalizeRecoveryToken(expectedHostName)) {
    return NextResponse.json(
      { message: "Password recovery is only allowed on the original workstation that completed setup." },
      { status: 401 },
    );
  }

  if (
    normalizeRecoveryToken(accountUsername) !== normalizeRecoveryToken(expectedAccountUsername) ||
    normalizeRecoveryToken(recoveryIdentity.accountUsername) !== normalizeRecoveryToken(expectedAccountUsername)
  ) {
    return NextResponse.json(
      { message: "The local computer account username could not be verified for this workstation." },
      { status: 401 },
    );
  }

  try {
    await updateAdminPassword(email, newPassword);
    return NextResponse.json({
      ok: true,
      recoveryContext: {
        deviceName: setupState.deviceName ?? recoveryIdentity.hostName,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not recover password.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
