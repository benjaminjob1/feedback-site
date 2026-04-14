import { supabaseAdmin } from "@/lib/supabase-admin";
import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth-server";

export async function DELETE(req: NextRequest) {
  const token = req.cookies.get("fb_session")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await verifySessionToken(token);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { delete_feedback } = await req.json().catch(() => ({}));

  const userEmail = payload.email.toLowerCase();

  // Get user profile
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id, email")
    .eq("email", userEmail)
    .single();

  // If delete_feedback is true, delete all feedback for this user first
  if (delete_feedback && profile) {
    await supabaseAdmin
      .from("feedback")
      .delete()
      .eq("submitted_by", profile.id); // Use profile ID to find feedback
  }

  // Delete notification preferences
  if (profile) {
    await supabaseAdmin
      .from("notification_preferences")
      .delete()
      .eq("user_id", profile.id);
  }

  // Delete the user's profile
  const { error } = await supabaseAdmin
    .from("profiles")
    .delete()
    .eq("email", userEmail);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, deleted_feedback: delete_feedback || false });
}
