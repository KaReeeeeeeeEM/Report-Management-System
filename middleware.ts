import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/session";

const PUBLIC_ROUTES = new Set(["/login"]);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/api/auth/login")
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (PUBLIC_ROUTES.has(pathname)) {
    if (session) {
      return NextResponse.redirect(new URL("/overview", request.url));
    }

    return NextResponse.next();
  }

  if (
    !session &&
    (pathname.startsWith("/overview") ||
      pathname.startsWith("/reports") ||
      pathname.startsWith("/recycle-bin") ||
      pathname.startsWith("/api/reports"))
  ) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!.*\\..*).*)"],
};
