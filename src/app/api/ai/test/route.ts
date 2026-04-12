import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "No ANTHROPIC_API_KEY set" });
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
        model: "claude-3-haiku-4-20250514",
        max_tokens: 100,
        messages: [{ role: "user", content: "Say hello in 3 words, return JSON: {greeting: \"...\"}" }],
      }),
    });

    const data = await res.json();
    return NextResponse.json({
      ok: res.ok,
      status: res.status,
      data,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message });
  }
}