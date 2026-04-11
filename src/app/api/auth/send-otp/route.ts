import { NextRequest, NextResponse } from "next/server";
import { generateOTP, storeOTP, getUserRole } from "@/lib/auth-server";
import axios from "axios";

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
      // Don't reveal whether email is authorized
      return NextResponse.json({ success: true, message: "Check your email for a code" });
    }

    const otp = generateOTP();
    storeOTP(normalizedEmail, otp);

    const subject = role === "admin" ? "🔐 BenBot Feedback Admin Login Code" : "🔐 BenBot Feedback Portal Login Code";
    const text = role === "admin"
      ? `Your admin login code is: ${otp}\n\nThis code expires in 5 minutes.\n\nIf you didn't request this, please ignore.`
      : `Your login code is: ${otp}\n\nThis code expires in 5 minutes.\n\nIf you didn't request this, please ignore.`;

    await axios.post("https://api.agentmail.to/v0/inboxes/bensbot@agentmail.to/messages/send", {
      to: normalizedEmail,
      subject,
      text,
    }, {
      headers: {
        "Authorization": `Bearer ${process.env.AGENTMAIL_API_KEY}`,
        "Content-Type": "application/json",
      },
      timeout: 10000,
    });

    return NextResponse.json({ success: true, message: "Check your email for a code" });
  } catch (error: any) {
    console.error("[send-otp] Error:", error.message);
    return NextResponse.json({ error: "Failed to send code" }, { status: 500 });
  }
}
