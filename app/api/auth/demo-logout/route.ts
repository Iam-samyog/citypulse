import { NextResponse } from "next/server";
import { demoSessionCookie } from "@/lib/demoAuth";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(demoSessionCookie, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
  return response;
}
