import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const RATING_LABELS: Record<number, string> = {
  1: "Poor",
  2: "Below Average",
  3: "Average",
  4: "Good",
  5: "Excellent",
};

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const { allowed, remaining, resetIn } = checkRateLimit(ip, 5); // 5 per hour for feedback questions

  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Try again later.", retryAfter: Math.ceil(resetIn / 1000) + "s" },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body.site !== "string" || typeof body.rating !== "number") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { site, rating } = body;
  const ratingLabel = RATING_LABELS[rating] || `(${rating}-star)`;

  const prompt = `For a user giving a ${rating}-star ("${ratingLabel}") review of "${site}", generate 2-3 specific, probing follow-up questions that would help gather deeper feedback. Return ONLY valid JSON with this exact structure:
{"questions": [{"question": "...", "placeholder": "..."}]}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
        "anthropic-version": "2023-06-01",
      } as HeadersInit,
      body: JSON.stringify({
        model: "claude-3-haiku-4-20250514",
        max_tokens: 300,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      const errText = await res.text();
      console.error("Anthropic error:", res.status, errText);
      return NextResponse.json({ questions: [], remaining }, { status: 500 });
    }

    const data = await res.json();

    let content = "";
    const rawContent = (data as any).content;
    if (Array.isArray(rawContent)) {
      content = rawContent.map((block: any) => block.text ?? "").join("").trim();
    } else if (typeof rawContent === "string") {
      content = rawContent.trim();
    }

    if (!content) {
      return NextResponse.json({ questions: [], remaining });
    }

    const jsonStr = content.replace(/^```json\s*/i, "").replace(/```\s*$/i, "");
    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      return NextResponse.json({ questions: [], remaining });
    }

    if (!Array.isArray(parsed.questions)) {
      return NextResponse.json({ questions: [], remaining });
    }

    return NextResponse.json({
      questions: parsed.questions.slice(0, 3).map((q: any) => ({
        question: typeof q.question === "string" ? q.question : "",
        placeholder: typeof q.placeholder === "string" ? q.placeholder : "",
      })),
      remaining,
    });
  } catch (err) {
    clearTimeout(timeout);
    console.error("AI feedback-questions error:", err);
    return NextResponse.json({ questions: [], remaining });
  }
}