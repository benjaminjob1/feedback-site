import { supabaseAdmin } from "@/lib/supabase-admin";
import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth-server";

type NotificationPrefs = {
  id: string;
  user_id: string;
  notify_new_feedback: boolean;
  notify_edited_feedback: boolean;
  created_at: string;
  updated_at: string;
  profiles?: { full_name: string; email: string };
};

export async function GET(req: NextRequest) {
  const token = req.cookies.get("fb_session")?.value;
  if (!token) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const payload = await verifySessionToken(token);
  if (!payload) return NextResponse.json({ error: "Login required" }, { status: 401 });

  // Check if admin
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id, role")
    .eq("email", payload.email.toLowerCase())
    .single() as { data: { id: string; role: string } | null };

  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  // Get all notification preferences with user info
  const { data, error } = await supabaseAdmin
    .from("notification_preferences")
    .select("*, profiles(full_name, email)")
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ preferences: data || [] });
}

export async function PATCH(req: NextRequest) {
  const token = req.cookies.get("fb_session")?.value;
  if (!token) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const payload = await verifySessionToken(token);
  if (!payload) return NextResponse.json({ error: "Login required" }, { status: 401 });

  // Check if admin
  const { data: adminProfile } = await supabaseAdmin
    .from("profiles")
    .select("id, role")
    .eq("email", payload.email.toLowerCase())
    .single() as { data: { id: string; role: string } | null };

  if (!adminProfile || adminProfile.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const body = await req.json();
  const { user_id, notify_new_feedback, notify_edited_feedback } = body;

  if (!user_id) {
    return NextResponse.json({ error: "user_id is required" }, { status: 400 });
  }

  // Don't allow updating own preferences through admin endpoint
  if (user_id === adminProfile.id) {
    return NextResponse.json({ error: "Cannot update own notification preferences here" }, { status: 400 });
  }

  // Check if user exists
  const { data: targetProfile } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("id", user_id)
    .single();

  if (!targetProfile) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Update preferences
  const updateData: Partial<NotificationPrefs> = { updated_at: new Date().toISOString() };
  if (typeof notify_new_feedback === "boolean") updateData.notify_new_feedback = notify_new_feedback;
  if (typeof notify_edited_feedback === "boolean") updateData.notify_edited_feedback = notify_edited_feedback;

  const { data, error } = await supabaseAdmin
    .from("notification_preferences")
    .update(updateData)
    .eq("user_id", user_id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ preferences: data });
}
