import { NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const WINDOW_MS = 60 * 60 * 1000; // 1 hour

export async function GET(req: Request) {
  const ip = getClientIp(req);
  const { allowed, remaining, resetIn } = checkRateLimit(ip, 20);

  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Try again later.", retryAfter: Math.ceil(resetIn / 1000) + "s" },
      { status: 429, headers: { "Retry-After": String(Math.ceil(resetIn / 1000)) } }
    );
  }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return NextResponse.json({ error: "No key set" });

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
        max_tokens: 100,
        messages: [{ role: "user", content: "Say hello" }],
      }),
    });

    const data = await res.json();
    return NextResponse.json({ ok: res.ok, status: res.status, remaining, data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message, remaining });
  }
}