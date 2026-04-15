import { supabaseAdmin } from "@/lib/supabase-admin";
import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth-server";

// Generate a short AI summary for feedback
async function generateFeedbackSummary(feedback: any): Promise<string | null> {
  const { site, rating, question_easy, question_improve, question_bugs, question_features, question_bugs_slider, question_other } = feedback;
  
  const ratingText = rating ? `${rating}/5 stars` : "No rating";
  const siteText = site || "Unknown site";
  
  // Build a brief context
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

export async function GET(req: NextRequest) {
  const token = req.cookies.get("fb_session")?.value;
  if (!token) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const payload = await verifySessionToken(token);
  if (!payload) return NextResponse.json({ error: "Login required" }, { status: 401 });

  // Look up profile by email
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id, role")
    .eq("email", payload.email.toLowerCase())
    .single() as { data: { id: string; role: string } | null };


  const role = profile?.role;
  const userId = profile?.id as string;

  if (!userId) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  // Check for site filter
  const siteFilter = req.nextUrl.searchParams.get("site");

  let query = supabaseAdmin
    .from("feedback")
    .select("*, profiles(full_name, email)")
    .order("created_at", { ascending: false });

  // Apply site filter if provided
  if (siteFilter) {
    query = query.eq("site", siteFilter);
  }

  if (role === "admin") {
    // Admins see everything
  } else if (role === "viewer") {
    // Viewers see approved feedback + their own
    query = query.or(`status.eq.approved,submitted_by.eq.${userId}`);
  } else {
    // Regular users: only own feedback
    query = query.eq("submitted_by", userId);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ feedback: data || [] });
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get("fb_session")?.value;
  if (!token) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const payload = await verifySessionToken(token);
  if (!payload) return NextResponse.json({ error: "Login required" }, { status: 401 });

  // Look up profile
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id, role")
    .eq("email", payload.email.toLowerCase())
    .single() as { data: { id: string; role: string } | null };

  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  const userId = profile.id;

  const body = await req.json();
  const { site, rating, question_easy, question_improve, question_bugs, question_features, question_bugs_slider, question_other, ai_questions, slider_comments, feedback_length, edit_id } = body;

  if (!site || !rating) {
    return NextResponse.json({ error: "Site and rating are required" }, { status: 400 });
  }

  // If editing existing feedback
  if (edit_id) {
    const editData: any = {
      rating,
      question_easy,
      question_improve,
      question_bugs,
      question_features,
      question_bugs_slider,
      question_other,
      ai_questions: ai_questions || null,
      slider_comments: slider_comments || null,
      feedback_length: feedback_length || "standard",
    };
    
    // Regenerate AI summary when feedback is edited
    editData.cached_ai_summary = null; // Clear first
    
    const { data, error } = await supabaseAdmin
      .from("feedback")
      .update(editData)
      .eq("id", edit_id)
      .eq("submitted_by", userId)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    
    // Generate new AI summary in background
    const summary = await generateFeedbackSummary(editData);
    if (summary) {
      await supabaseAdmin
        .from("feedback")
        .update({ cached_ai_summary: summary })
        .eq("id", edit_id);
      data.cached_ai_summary = summary;
    }
    
    return NextResponse.json({ feedback: data, edited: true });
  }

  // Check for existing feedback on this site by this user
  const { data: existing } = await supabaseAdmin
    .from("feedback")
    .select("id")
    .eq("submitted_by", profile.id)
    .eq("site", site)
    .single();

  if (existing) {
    return NextResponse.json({ error: "You've already submitted feedback for this site. Use the edit option to update it.", existing_id: existing.id }, { status: 409 });
  }

  // Insert new feedback
  const { data, error } = await supabaseAdmin
    .from("feedback")
    .insert({
      site,
      rating,
      question_easy,
      question_improve,
      question_bugs,
      question_features,
      question_bugs_slider,
      question_other,
      ai_questions: ai_questions || null,
      slider_comments: slider_comments || null,
      feedback_length: feedback_length || "standard",
      submitted_by: userId,
      status: "pending",
      cached_ai_summary: null, // Will be generated async
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Generate AI summary in background (async, don't wait)
  const newFeedbackId = data?.id;
  generateFeedbackSummary({ site, rating, question_easy, question_improve, question_bugs, question_features, question_bugs_slider, question_other }).then(async (summary) => {
    if (summary && newFeedbackId) {
      await supabaseAdmin
        .from("feedback")
        .update({ cached_ai_summary: summary })
        .eq("id", newFeedbackId as string);
    }
  }).catch(() => {});

  return NextResponse.json({ feedback: data, edited: false });
}
