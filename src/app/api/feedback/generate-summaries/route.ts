import { supabaseAdmin } from "@/lib/supabase-admin";
import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth-server";

// Generate a short AI summary for feedback
async function generateFeedbackSummary(feedback: any): Promise<string | null> {
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

  const prompt = `Summarize this feedback in 2-3 short sentences max, as if you're a concise assistant: "${context}"
  
Give only the summary, no labels or prefixes. Be very brief.`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-7-latest",
        max_tokens: 100,
        messages: [{ role: "user", content: prompt }]
      }),
      signal: controller.signal,
    });
    
    clearTimeout(timeout);
    
    if (!res.ok) return null;
    
    const data = await res.json();
    const summary = data.content?.[0]?.text?.trim();
    return summary || null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get("fb_session")?.value;
  if (!token) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const payload = await verifySessionToken(token);
  if (!payload) return NextResponse.json({ error: "Login required" }, { status: 401 });

  // Get all feedback without summaries
  const { data: feedbackWithoutSummaries, error } = await supabaseAdmin
    .from("feedback")
    .select("id, site, rating, question_easy, question_improve, question_bugs, question_features, question_bugs_slider, question_other")
    .is("cached_ai_summary", null);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let generated = 0;
  
  // Generate summaries for each
  for (const fb of feedbackWithoutSummaries || []) {
    const summary = await generateFeedbackSummary(fb);
    const fbId = fb.id as string;
    if (summary) {
      await supabaseAdmin
        .from("feedback")
        .update({ cached_ai_summary: summary })
        .eq("id", fbId);
      generated++;
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  return NextResponse.json({ success: true, generated });
}
