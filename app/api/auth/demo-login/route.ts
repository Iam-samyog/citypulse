import { NextResponse } from "next/server";
import { z } from "zod";
import { createDemoSession, demoSessionCookie, demoSessionMaxAge, getDemoCredentials, hasDemoConfiguration } from "@/lib/demoAuth";

const bodySchema = z.object({ username: z.string().trim().min(1).max(80), password: z.string().min(1).max(200) });

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Enter the demo username and password." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Enter the demo username and password." }, { status: 400 });

  const credentials = getDemoCredentials();
  if (!hasDemoConfiguration()) {
    return NextResponse.json({ error: "Demo access is not configured on this deployment." }, { status: 503 });
  }
  if (parsed.data.username !== credentials.username || parsed.data.password !== credentials.password) {
    return NextResponse.json({ error: "That username or password is incorrect." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(demoSessionCookie, await createDemoSession(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: demoSessionMaxAge,
  });
  return response;
}
