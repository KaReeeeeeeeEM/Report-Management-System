import { jwtVerify, SignJWT } from "jose";

import { SESSION_COOKIE_NAME } from "@/lib/session-constants";

const JWT_SECRET = Buffer.from(process.env.JWT_SECRET ?? "change-me-in-production", "utf8");

export async function createSessionToken(email: string, name: string) {
  return new SignJWT({ email, name })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

export async function createSessionCookie(email: string, name: string) {
  return {
    name: SESSION_COOKIE_NAME,
    value: await createSessionToken(email, name),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  };
}

export async function verifySessionToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      email: payload.email as string,
      name: payload.name as string,
    };
  } catch {
    return null;
  }
}
