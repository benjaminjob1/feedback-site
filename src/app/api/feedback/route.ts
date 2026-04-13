import { supabaseAdmin } from "@/lib/supabase-admin";
import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth-server";

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


  let query = supabaseAdmin
    .from("feedback")
    .select("*, profiles(full_name, email)")
    .order("created_at", { ascending: false });


  if (role === "admin") {
    // Admins see everything
  } else {
    // Viewers and regular users: only own feedback
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
    const { data, error } = await supabaseAdmin
      .from("feedback")
      .update({
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
      })
      .eq("id", edit_id)
      .eq("submitted_by", userId)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
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
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ feedback: data, edited: false });
}
