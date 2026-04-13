import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const SCALE_QUESTIONS = [
  { key: "question_easy", label: "Ease of use" },
  { key: "question_improve", label: "Design & layout" },
  { key: "question_bugs", label: "Speed & performance" },
  { key: "question_features", label: "Features & functionality" },
];

const RATING_LABELS: Record<number, string> = {
  1: "Poor",
  2: "Below Average",
  3: "Average",
  4: "Good",
  5: "Excellent",
};

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const { allowed, remaining, resetIn } = checkRateLimit(ip, 5);

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

  const { site, rating, sliderValues, sliderComments, aiAnswers, count, exclude = [] } = body;
  const ratingLabel = RATING_LABELS[rating] || `(${rating}-star)`;

  const sliderInfo = sliderValues
    ? "Scale answers given:\n" + SCALE_QUESTIONS.map(({key, label}) => `  - ${label}: ${sliderValues[key] ?? "not answered"}/10`).join("\n")
    : "";

  const sliderCommentsInfo = sliderComments && typeof sliderComments === "object"
    ? "User comments on scales:\n" + Object.entries(sliderComments).filter(([, v]) => typeof v === "string" && v.trim()).map(([k, v]) => `  - ${k}: "${v}"`).join("\n")
    : "";

  const aiAnswersInfo = aiAnswers && typeof aiAnswers === "object"
    ? "Already-asked AI follow-up questions and answers:\n" + Object.entries(aiAnswers).filter(([, v]) => typeof v === "string" && v.trim()).map(([k, v]) => `  - Q: "${k}"\n    A: "${v}"`).join("\n")
    : "";

  const excludeList: string[] = Array.isArray(exclude) ? exclude : [];

  const requested = typeof count === "number" ? Math.min(Math.max(count, 1), 5) : 3;
  // Request more than needed to account for similarity filtering
  const maxToGenerate = Math.max(requested, Math.min(count * 3, 10));

  const existingListStr = excludeList.length > 0
    ? "Already-asked questions (DO NOT repeat or ask similar ones):\n" + excludeList.map(q => `  - "${q}"`).join("\n") + "\n"
    : "";

  const prompt = `For a user giving a ${rating}-star ("${ratingLabel}") review of "${site}", ${sliderInfo ? `they answered the following scales:\n${sliderInfo}\n` : ""}${existingListStr}${sliderCommentsInfo ? sliderCommentsInfo + "\n" : ""}${aiAnswersInfo ? aiAnswersInfo + "\n" : ""}Generate AT LEAST ${requested} different follow-up questions (aim for ${maxToGenerate} to account for filtering), each covering a COMPLETELY different topic or angle. Return ONLY valid JSON:
{"questions": [{"question": "...", "placeholder": "..."}]}

STRICT RULES:
- Each question MUST be on a completely different topic from all others
- Do NOT ask about the same feature, aspect, or theme as any existing question
- Do not rephrase or restate the same idea in different words
- If an existing question covers "ease of use", do not ask about "usability" or "user-friendliness"
- Think about what DIFFERENT areas could be explored: specific examples, outcomes, comparisons, priorities, suggestions, etc.`;

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
        model: "claude-haiku-4-5-20251001",
        max_tokens: 400,
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

    // Filter out excluded and similar questions
    const filtered = parsed.questions.filter((q: any) => {
      const qText = (q.question || "").toLowerCase().trim();
      if (!qText) return false;
      for (const ex of excludeList) {
        const exText = ex.toLowerCase().trim();
        // Exact match
        if (exText === qText) return false;
        // Contained
        if (qText.includes(exText) || exText.includes(qText)) return false;
        // Word overlap: split on non-word chars, filter short words, count shared
        const qWords: string[] = qText.split(/\W+/).filter((w: string) => w.length > 3);
        const exWords: string[] = exText.split(/\W+/).filter((w: string) => w.length > 3);
        const overlap = qWords.filter((w: string) => exWords.includes(w)).length;
        if (overlap >= 3) return false;
      }
      return true;
    });

    return NextResponse.json({
      questions: filtered.slice(0, requested).map((q: any) => ({
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
