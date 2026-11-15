import { NextRequest, NextResponse } from "next/server";
import { demoSessionCookie, isValidDemoSession } from "@/lib/demoAuth";

const PUBLIC_PATHS = new Set(["/login", "/api/auth/demo-login", "/api/auth/demo-logout"]);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (
    PUBLIC_PATHS.has(pathname) ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/art/") ||
    pathname.startsWith("/images/") ||
    pathname === "/favicon.ico"
  ) {
    if (pathname === "/login" && await isValidDemoSession(request.cookies.get(demoSessionCookie)?.value)) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  if (await isValidDemoSession(request.cookies.get(demoSessionCookie)?.value)) return NextResponse.next();
  if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Sign in to access the CITYPULSE demo." }, { status: 401 });
  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = { matcher: ["/:path*"] };
