import { supabaseAdmin } from "@/lib/supabase-admin";
import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth-server";

// Generate a short AI summary for feedback
async function generateFeedbackSummary(feedback: any, apiKey: string): Promise<string | null> {
  const { site, rating, question_easy, question_improve, question_bugs, question_features, question_bugs_slider, question_other } = feedback;
  
  const ratingText = rating ? `${rating}/5 stars` : "No rating";
  const siteText = site || "Unknown site";
  
  const sliderScores = [];
  if (question_easy) sliderScores.push(`Ease: ${question_easy}/10`);
  if (question_improve) sliderScores.push(`Design: ${question_improve}/10`);
  if (question_bugs) sliderScores.push(`Speed: ${question_bugs}/10`);
  if (question_features) sliderScores.push(`Features: ${question_features}/10`);
  if (question_bugs_slider) sliderScores.push(`No bugs: ${question_bugs_slider}/10`);
  
  const context = `Site: ${siteText}, Rating: ${ratingText}${sliderScores.length > 0 ? ", Scores: " + sliderScores.join(", ") : ""}${question_other ? ", Comment: " + question_other.substring(0, 200) : ""}`;
  const prompt = `Summarize this feedback in 2-3 short sentences max: "${context}". Be very brief.`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 150,
        messages: [{ role: "user", content: prompt }]
      }),
      signal: controller.signal,
    });
    
    clearTimeout(timeout);
    
    if (!res.ok) {
      console.error("[generate-summaries] API error:", res.status);
      return null;
    }
    
    const data = await res.json();
    const rawContent = (data as any).content;
    let summary = "";
    if (Array.isArray(rawContent)) {
      summary = rawContent.map((block: any) => block.text ?? "").join("").trim();
    } else if (typeof rawContent === 'string') {
      summary = rawContent;
    }
    return summary || null;
  } catch (err) {
    console.error("[generate-summaries] Error:", err);
    return null;
  }
}

export async function POST(req: NextRequest) {
  // Note: Not requiring auth - this is an internal API to populate cached data
  // In production, you may want to add proper authentication

  // Check if ANTHROPIC_API_KEY is set
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  // Get all feedback without summaries
  const { data: feedbackWithoutSummaries, error } = await supabaseAdmin
    .from("feedback")
    .select("id, site, rating, question_easy, question_improve, question_bugs, question_features, question_bugs_slider, question_other")
    .is("cached_ai_summary", null);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let generated = 0;
  let failed = 0;
  
  // Generate summaries for each
  for (const fb of feedbackWithoutSummaries || []) {
    const summary = await generateFeedbackSummary(fb, apiKey);
    const fbId = fb.id as string;
    if (summary) {
      await supabaseAdmin
        .from("feedback")
        .update({ cached_ai_summary: summary })
        .eq("id", fbId);
      generated++;
    } else {
      failed++;
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  return NextResponse.json({ success: true, generated, failed, total: feedbackWithoutSummaries?.length || 0 });
}
