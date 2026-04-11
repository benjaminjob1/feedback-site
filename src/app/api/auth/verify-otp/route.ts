import { NextRequest, NextResponse } from "next/server";
import { verifyOTP, getUserRole, createSessionToken } from "@/lib/auth-server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { email, otp } = await req.json();
    if (!email || !otp) {
      return NextResponse.json({ error: "Email and code required" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase();
    const role = getUserRole(normalizedEmail);
    if (!role) {
      return NextResponse.json({ error: "Invalid email or code" }, { status: 401 });
    }

    const valid = verifyOTP(normalizedEmail, otp);
    if (!valid) {
      return NextResponse.json({ error: "Invalid or expired code" }, { status: 401 });
    }

    const token = await createSessionToken(normalizedEmail, role);

    const response = NextResponse.json({ success: true, email: normalizedEmail, role });
    response.cookies.set("fb_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("[verify-otp] Error:", error.message);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
