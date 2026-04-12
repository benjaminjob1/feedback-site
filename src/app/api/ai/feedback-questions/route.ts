import { NextRequest, NextResponse } from "next/server";

const RATING_LABELS: Record<number, string> = {
  1: "Poor",
  2: "Below Average",
  3: "Average",
  4: "Good",
  5: "Excellent",
};

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.site !== "string" || typeof body.rating !== "number") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { site, rating } = body;
  const ratingLabel = RATING_LABELS[rating] || `(${rating}-star)`;

  const prompt = `For a user giving a ${rating}-star ("${ratingLabel}") review of "${site}", generate 2-3 specific, probing follow-up questions that would help gather deeper feedback. Each question should dig into a different aspect (e.g. what worked well, what frustrated them, what they'd change). Return ONLY valid JSON with this exact structure — no markdown, no explanation:
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
        model: "claude-3-5-haiku-20241022",
        max_tokens: 300,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      console.error("Anthropic error:", res.status, await res.text());
      return NextResponse.json({ questions: [] });
    }

    const data = await res.json();
    const content: string = data.content?.[0]?.text?.trim() ?? "";

    const jsonStr = content.replace(/^```json\s*/i, "").replace(/```\s*$/i, "");
    const parsed = JSON.parse(jsonStr);

    if (!Array.isArray(parsed.questions)) {
      return NextResponse.json({ questions: [] });
    }

    return NextResponse.json({
      questions: parsed.questions.slice(0, 3).map((q: any) => ({
        question: typeof q.question === "string" ? q.question : "",
        placeholder: typeof q.placeholder === "string" ? q.placeholder : "",
      })),
    });
  } catch (err) {
    clearTimeout(timeout);
    console.error("AI feedback-questions error:", err);
    return NextResponse.json({ questions: [] });
  }
}