import { NextRequest, NextResponse } from "next/server";
import { verifyOTTToken, createSessionToken } from "@/lib/auth-server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(new URL("/login?error=missing_token", req.url), { status: 303 });
  }

  const payload = await verifyOTTToken(token);
  if (!payload) {
    return NextResponse.redirect(new URL("/login?error=invalid_token", req.url), { status: 303 });
  }

  const sessionToken = await createSessionToken(payload.email, payload.role);

  // Redirect to home with token in URL, let the page's useEffect set the cookie
  const redirectUrl = new URL("/", req.url);
  redirectUrl.searchParams.set("t", sessionToken);
  const response = NextResponse.redirect(redirectUrl, { status: 303 });
  
  // Also set cookie on the redirect
  response.cookies.set("fb_session", sessionToken, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });

  return response;
}

export async function POST(req: NextRequest) {
  try {
    const { email, token } = await req.json();
    if (!email || !token) {
      return NextResponse.json({ error: "Email and token required" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase();
    const payload = await verifyOTTToken(token);
    if (!payload || payload.email !== normalizedEmail) {
      return NextResponse.json({ error: "Invalid or expired link" }, { status: 401 });
    }

    const sessionToken = await createSessionToken(normalizedEmail, payload.role);
    const response = NextResponse.json({ success: true, email: normalizedEmail, role: payload.role });
    response.cookies.set("fb_session", sessionToken, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });
    return response;
  } catch (error: any) {
    console.error("[verify-otp] Error:", error.message);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
