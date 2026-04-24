import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { connectToDatabase } from "@/lib/db";
import { isDesktopEmbeddedMode, readDesktopDatabase } from "@/lib/desktop-db";
import { AdminModel } from "@/models/Admin";
import { SESSION_COOKIE_NAME } from "@/lib/session-constants";
import { createSessionCookie, verifySessionToken } from "@/lib/session";

export async function getSession() {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export async function requireApiSession() {
  const session = await getSession();
  if (!session) {
    throw new Error("Unauthorized");
  }
  return session;
}

export async function verifyAdminCredentials(email: string, password: string) {
  if (isDesktopEmbeddedMode()) {
    const database = await readDesktopDatabase();
    const admin = database.admins.find((item) => item.email === email) ?? null;

    if (!admin) return null;

    const valid = await bcrypt.compare(password, admin.passwordHash);
    return valid ? admin : null;
  }

  await connectToDatabase();
  const admin = await AdminModel.findOne({ email }).lean<{ email: string; name: string; passwordHash: string } | null>();
  if (!admin) return null;

  const valid = await bcrypt.compare(password, admin.passwordHash);
  return valid ? admin : null;
}

export function getAdminDefaults() {
  return {
    email: process.env.ADMIN_EMAIL ?? "kwangu.zabrone@tie.go.tz",
    password: process.env.ADMIN_PASSWORD ?? "kwangumasalu",
    name: process.env.ADMIN_NAME ?? "Kwangu Masalu",
  };
}

export { SESSION_COOKIE_NAME, createSessionCookie, verifySessionToken };
