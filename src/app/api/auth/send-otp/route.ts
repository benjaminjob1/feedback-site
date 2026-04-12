import { NextRequest, NextResponse } from "next/server";
import { createOTTToken, getUserRole } from "@/lib/auth-server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://feedback.benjob.me";

    const role = getUserRole(normalizedEmail);
    const ottToken = await createOTTToken(normalizedEmail, role || "user");
    const loginUrl = `${siteUrl}/api/auth/verify-otp?token=${ottToken}`;

    const subject = "🔐 Feedback Portal Login Link (+ token below)";
    const text = `Your Feedback Portal login link:\n\n${loginUrl}\n\nOr use this token directly:\n${ottToken}\n\nThis token expires in 5 minutes.\n\nIf you didn't request this, ignore this email.`;

    const response = await fetch("https://api.agentmail.to/v0/inboxes/bensbot@agentmail.to/messages/send", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.AGENTMAIL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ to: normalizedEmail, subject, text }),
    });

    if (!response.ok) {
      console.error("[send-otp] AgentMail error:", await response.text());
    }

    return NextResponse.json({ success: true, message: "Check your email for a link", token: ottToken });
  } catch (error: any) {
    console.error("[send-otp] Error:", error.message);
    return NextResponse.json({ error: "Failed to send link" }, { status: 500 });
  }
}
