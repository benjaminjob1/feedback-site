import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return NextResponse.json({ error: "No key" });

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
        max_tokens: 300,
        messages: [{ role: "user", content: 'Return JSON: {"questions": [{"question": "What did you like most?", "placeholder": "Your answer..."}]}' }],
      }),
    });

    const data = await res.json();

    // Log the full response structure so we can debug
    console.log("Full Anthropic response:", JSON.stringify(data, null, 2));

    const rawContent = (data as any).content;
    let text = "";
    if (Array.isArray(rawContent)) {
      text = rawContent.map((b: any) => b.text ?? "").join("");
    }

    return NextResponse.json({
      ok: res.ok,
      status: res.status,
      content: rawContent,
      text,
      parsed: text ? JSON.parse(text) : null,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message });
  }
}