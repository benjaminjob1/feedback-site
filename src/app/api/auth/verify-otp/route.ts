import { NextRequest, NextResponse } from "next/server";
import { verifyOTTToken, createSessionToken, getUserRole } from "@/lib/auth-server";

export const runtime = "nodejs";

function setSessionCookie(response: NextResponse, token: string) {
  response.cookies.set("fb_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });
}

export async function GET(req: NextRequest) {
  // Magic link: user clicked link in email → token in query param
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(new URL("/login?error=missing_token", req.url));
  }

  const payload = await verifyOTTToken(token);
  if (!payload) {
    return NextResponse.redirect(new URL("/login?error=invalid_token", req.url));
  }

  const sessionToken = await createSessionToken(payload.email, payload.role);
  const response = NextResponse.redirect(new URL("/", req.url));
  setSessionCookie(response, sessionToken);
  return response;
}

export async function POST(req: NextRequest) {
  try {
    const { email, token } = await req.json();
    if (!email || !token) {
      return NextResponse.json({ error: "Email and token required" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase();
    const role = getUserRole(normalizedEmail);
    if (!role) {
      return NextResponse.json({ error: "Invalid link" }, { status: 401 });
    }

    const payload = await verifyOTTToken(token);
    if (!payload || payload.email !== normalizedEmail) {
      return NextResponse.json({ error: "Invalid or expired link" }, { status: 401 });
    }

    const sessionToken = await createSessionToken(normalizedEmail, role);
    const response = NextResponse.json({ success: true, email: normalizedEmail, role });
    setSessionCookie(response, sessionToken);
    return response;
  } catch (error: any) {
    console.error("[verify-otp] Error:", error.message);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
