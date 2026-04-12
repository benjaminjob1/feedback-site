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
    const role = getUserRole(normalizedEmail);
    if (!role) {
      // Don't reveal whether email is authorized - still send success to avoid enumeration
      return NextResponse.json({ success: true, message: "Check your email for a link", token: "" });
    }

    const ottToken = await createOTTToken(normalizedEmail, role);
    const loginUrl = `https://feedback.benjob.me/api/auth/verify-otp?token=${ottToken}`;

    const subject = role === "admin" ? "🔐 BenBot Feedback Admin Login Link" : "🔐 BenBot Feedback Portal Login Link";
    const text = role === "admin"
      ? `Click this link to sign in (expires in 5 minutes):\n\n${loginUrl}\n\nIf you didn't request this, please ignore.`
      : `Click this link to sign in (expires in 5 minutes):\n\n${loginUrl}\n\nIf you didn't request this, please ignore.`;

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
