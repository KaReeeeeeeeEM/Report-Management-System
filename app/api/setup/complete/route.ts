import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import { createSessionCookie } from "@/lib/auth";
import { isDesktopEmbeddedMode, readDesktopDatabase, writeDesktopDatabase } from "@/lib/desktop-db";
import { getDefaultDeviceName, readDesktopSetupState, requiresDesktopSetup, writeDesktopSetupState } from "@/lib/desktop-setup";

type SetupPayload = {
  organizationName?: string;
  deviceName?: string;
  adminName?: string;
  adminEmail?: string;
  password?: string;
  databaseMode?: "desktop-embedded" | "local-mongodb";
};

function normalizeValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  if (!isDesktopEmbeddedMode()) {
    return NextResponse.json({ message: "Desktop setup is only available in the desktop app." }, { status: 400 });
  }

  if (!(await requiresDesktopSetup())) {
    return NextResponse.json({ message: "Desktop setup has already been completed." }, { status: 409 });
  }

  const body = (await request.json().catch(() => null)) as SetupPayload | null;
  const organizationName = normalizeValue(body?.organizationName);
  const deviceName = normalizeValue(body?.deviceName) || getDefaultDeviceName();
  const adminName = normalizeValue(body?.adminName);
  const adminEmail = normalizeValue(body?.adminEmail).toLowerCase();
  const password = typeof body?.password === "string" ? body.password : "";
  const requestedDatabaseMode = body?.databaseMode === "local-mongodb" ? "local-mongodb" : "desktop-embedded";

  if (!organizationName || !adminName || !adminEmail || !password) {
    return NextResponse.json({ message: "Organization, device, and admin credentials are required." }, { status: 400 });
  }

  if (!adminEmail.includes("@")) {
    return NextResponse.json({ message: "Enter a valid admin email address." }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ message: "Admin password must be at least 8 characters." }, { status: 400 });
  }

  if (requestedDatabaseMode === "local-mongodb") {
    return NextResponse.json(
      { message: "This installer build still uses the embedded desktop database. Local MongoDB setup will need the next installer phase." },
      { status: 400 },
    );
  }

  const [database, setupState] = await Promise.all([readDesktopDatabase(), readDesktopSetupState()]);
  const now = new Date().toISOString();
  const passwordHash = await bcrypt.hash(password, 10);
  const existingAdmin = database.admins.find((admin) => admin.email === adminEmail);

  if (existingAdmin) {
    existingAdmin.name = adminName;
    existingAdmin.passwordHash = passwordHash;
    existingAdmin.updatedAt = now;
  } else {
    database.admins.unshift({
      id: randomUUID(),
      name: adminName,
      email: adminEmail,
      passwordHash,
      createdAt: now,
      updatedAt: now,
    });
  }

  await writeDesktopDatabase(database);
  await writeDesktopSetupState({
    ...setupState,
    completedAt: now,
    organizationName,
    deviceName,
    adminName,
    adminEmail,
    databaseMode: "desktop-embedded",
  });

  const response = NextResponse.json({
    ok: true,
    user: {
      email: adminEmail,
      name: adminName,
    },
  });

  response.cookies.set(await createSessionCookie(adminEmail, adminName));
  return response;
}
