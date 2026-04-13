import { NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function GET(req: Request) {
  const ip = getClientIp(req);
  const { allowed, remaining, resetIn } = checkRateLimit(ip, 20);

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return NextResponse.json({ aiAvailable: false, reason: "no_key", rateLimit: { remaining } });
  }

  // Do a real test call to see if AI actually works
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude_haiku_4_5",
        max_tokens: 10,
        messages: [{ role: "user", content: "hi" }],
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json({
        aiAvailable: false,
        reason: err?.error?.type || "api_error",
        rateLimit: { remaining },
      });
    }

    return NextResponse.json({ aiAvailable: true, rateLimit: { remaining } });
  } catch (err: any) {
    return NextResponse.json({ aiAvailable: false, reason: err.message, rateLimit: { remaining } });
  }
}