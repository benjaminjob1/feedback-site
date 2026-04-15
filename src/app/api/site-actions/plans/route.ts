import { supabaseAdmin } from "@/lib/supabase-admin";
import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth-server";

// GET - List all action plans (admin only)
export async function GET(req: NextRequest) {
  const token = req.cookies.get("fb_session")?.value;
  if (!token) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const payload = await verifySessionToken(token);
  if (!payload) return NextResponse.json({ error: "Login required" }, { status: 401 });

  // Verify admin
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("email", payload.email.toLowerCase())
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  // Optional site filter
  const siteFilter = req.nextUrl.searchParams.get("site");

  let query = supabaseAdmin
    .from("action_plans")
    .select("*")
    .order("created_at", { ascending: false });

  if (siteFilter) {
    query = query.eq("site", siteFilter);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ plans: data || [] });
}

// POST - Create action plan by analyzing feedback with AI
export async function POST(req: NextRequest) {
  const token = req.cookies.get("fb_session")?.value;
  if (!token) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const payload = await verifySessionToken(token);
  if (!payload) return NextResponse.json({ error: "Login required" }, { status: 401 });

  // Verify admin
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id, role")
    .eq("email", payload.email.toLowerCase())
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { site, feedbackIds } = await req.json();
  if (!site) return NextResponse.json({ error: "Site is required" }, { status: 400 });

  // Fetch feedback - either specific IDs or all approved for site
  let feedbackQuery = supabaseAdmin
    .from("feedback")
    .select("*")
    .eq("site", site)
    .eq("status", "approved");

  if (feedbackIds && feedbackIds.length > 0) {
    feedbackQuery = feedbackQuery.in("id", feedbackIds);
  }

  const { data: feedback, error: fbError } = await feedbackQuery;

  if (fbError) return NextResponse.json({ error: fbError.message }, { status: 500 });

  if (!feedback || feedback.length === 0) {
    return NextResponse.json({ error: "No approved feedback to analyze" }, { status: 400 });
  }

  // Build context from feedback
  const feedbackContext = feedback.map((fb, i) => {
    const sliders = [];
    if (fb.question_easy) sliders.push(`Ease: ${fb.question_easy}/10`);
    if (fb.question_improve) sliders.push(`Design: ${fb.question_improve}/10`);
    if (fb.question_bugs) sliders.push(`Speed: ${fb.question_bugs}/10`);
    if (fb.question_features) sliders.push(`Features: ${fb.question_features}/10`);
    if (fb.question_bugs_slider) sliders.push(`No bugs: ${fb.question_bugs_slider}/10`);
    
    let context = `Feedback ${i + 1}: Rating ${fb.rating}/5`;
    if (sliders.length > 0) context += `, Scores: ${sliders.join(", ")}`;
    if (fb.question_other) context += `, Comment: ${fb.question_other}`;
    return context;
  }).join("\n");

  // Check for ANTHROPIC_API_KEY
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  // AI prompt to analyze feedback and generate action plan
  const prompt = `Analyze the following feedback for a website/project and create an action plan.

Feedback:
${feedbackContext}

Based on this feedback:
1. Identify the main issues (problems, complaints, missing features, bugs mentioned, low scores)
2. Create specific action items to address these issues
3. Set an appropriate priority level

Respond ONLY with valid JSON in this exact format (no markdown, no explanation):
{
  "summary": "Brief 1-2 sentence summary of the overall feedback themes and what needs attention",
  "issues": ["Issue 1 description", "Issue 2 description", "Issue 3 description"],
  "actionItems": ["Action 1: specific action to take", "Action 2: specific action to take", "Action 3: specific action to take"],
  "priority": "high" or "medium" or "low" depending on severity
}

Only include issues that are actually mentioned in the feedback. Be specific and actionable.`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 800,
        messages: [{ role: "user", content: prompt }]
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      const errText = await res.text();
      console.error("[action-plans] API error:", res.status, errText);
      return NextResponse.json({ error: "AI analysis failed" }, { status: 500 });
    }

    const data = await res.json();
    const rawContent = (data as any).content;
    let aiResponse = "";
    if (Array.isArray(rawContent)) {
      aiResponse = rawContent.map((block: any) => block.text ?? "").join("").trim();
    } else if (typeof rawContent === 'string') {
      aiResponse = rawContent;
    }

    // Parse AI response
    let analysis;
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        analysis = JSON.parse(aiResponse);
      }
    } catch (parseErr) {
      console.error("[action-plans] JSON parse error:", parseErr, "Response was:", aiResponse);
      return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
    }

    // Validate required fields
    if (!analysis.summary || !analysis.issues || !analysis.actionItems) {
      return NextResponse.json({ error: "Incomplete AI response" }, { status: 500 });
    }

    // Save action plan with feedback IDs used
    const { data: plan, error: insertError } = await supabaseAdmin
      .from("action_plans")
      .insert({
        site,
        summary: analysis.summary,
        issues: JSON.stringify(analysis.issues),
        action_items: JSON.stringify(analysis.actionItems),
        priority: analysis.priority || "medium",
        status: "pending",
        feedback_ids: JSON.stringify(feedback.map(fb => fb.id)),
        created_by: profile.id,
      })
      .select()
      .single();

    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

    return NextResponse.json({ plan, analyzed: feedback.length, feedbackCount: feedback.length });
  } catch (err: any) {
    console.error("[action-plans] Error:", err);
    return NextResponse.json({ error: err.message || "Analysis failed" }, { status: 500 });
  }
}

// PATCH - Update action plan (status, priority)
export async function PATCH(req: NextRequest) {
  const token = req.cookies.get("fb_session")?.value;
  if (!token) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const payload = await verifySessionToken(token);
  if (!payload) return NextResponse.json({ error: "Login required" }, { status: 401 });

  // Verify admin
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("email", payload.email.toLowerCase())
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { id, status, priority } = await req.json();
  if (!id) return NextResponse.json({ error: "Plan ID required" }, { status: 400 });

  const updates: any = { updated_at: new Date().toISOString() };
  if (status) updates.status = status;
  if (priority) updates.priority = priority;

  const { data, error } = await supabaseAdmin
    .from("action_plans")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ plan: data });
}

// DELETE - Remove an action plan
export async function DELETE(req: NextRequest) {
  const token = req.cookies.get("fb_session")?.value;
  if (!token) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const payload = await verifySessionToken(token);
  if (!payload) return NextResponse.json({ error: "Login required" }, { status: 401 });

  // Verify admin
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("email", payload.email.toLowerCase())
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Plan ID required" }, { status: 400 });

  const { error } = await supabaseAdmin
    .from("action_plans")
    .delete()
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
