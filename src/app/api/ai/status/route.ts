import { NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

// Simple in-memory cache for AI status check (30 seconds)
let cachedStatus: { aiAvailable: boolean; reason?: string; cachedAt: number } | null = null;
const CACHE_TTL = 30_000;

export async function GET(req: Request) {
  const ip = getClientIp(req);
  const { allowed, remaining, resetIn } = checkRateLimit(ip, 20);

  // Return cached if still fresh
  if (cachedStatus && Date.now() - cachedStatus.cachedAt < CACHE_TTL) {
    return NextResponse.json({ ...cachedStatus, rateLimit: { remaining }, cached: true });
  }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    cachedStatus = { aiAvailable: false, reason: "no_key", cachedAt: Date.now() };
    return NextResponse.json({ aiAvailable: false, reason: "no_key", rateLimit: { remaining } });
  }

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
      cachedStatus = { aiAvailable: false, reason: err?.error?.type || "api_error", cachedAt: Date.now() };
      return NextResponse.json({ aiAvailable: false, reason: err?.error?.type, rateLimit: { remaining } });
    }

    cachedStatus = { aiAvailable: true, cachedAt: Date.now() };
    return NextResponse.json({ aiAvailable: true, rateLimit: { remaining } });
  } catch (err: any) {
    cachedStatus = { aiAvailable: false, reason: err.message, cachedAt: Date.now() };
    return NextResponse.json({ aiAvailable: false, reason: err.message, rateLimit: { remaining } });
  }
}