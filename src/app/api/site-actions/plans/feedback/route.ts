import { supabaseAdmin } from "@/lib/supabase-admin";
import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth-server";

// GET - Fetch feedback by IDs (for viewing action plan source)
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

  const { searchParams } = new URL(req.url);
  const ids = searchParams.get("ids");
  if (!ids) return NextResponse.json({ error: "Feedback IDs required" }, { status: 400 });

  const feedbackIds = ids.split(",").filter(Boolean);
  if (feedbackIds.length === 0) return NextResponse.json({ feedback: [] });

  const { data, error } = await supabaseAdmin
    .from("feedback")
    .select(\"id, site, rating, question_other, cached_ai_summary, created_at, profiles(full_name, email)\")
    .in(\"id\", feedbackIds);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ feedback: data || [] });
}
