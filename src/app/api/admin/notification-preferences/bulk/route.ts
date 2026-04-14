import { supabaseAdmin } from "@/lib/supabase-admin";
import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth-server";

export async function POST(req: NextRequest) {
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
  const { user_ids, notify_new_feedback, notify_edited_feedback } = body;

  if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
    return NextResponse.json({ error: "user_ids array is required" }, { status: 400 });
  }

  // Remove admin's own ID if present
  const filteredUserIds = user_ids.filter((id: string) => id !== adminProfile.id);

  if (filteredUserIds.length === 0) {
    return NextResponse.json({ error: "No valid user IDs provided" }, { status: 400 });
  }

  // Build update data
  const updateData: any = { updated_at: new Date().toISOString() };
  if (typeof notify_new_feedback === "boolean") updateData.notify_new_feedback = notify_new_feedback;
  if (typeof notify_edited_feedback === "boolean") updateData.notify_edited_feedback = notify_edited_feedback;

  // Update all specified users
  const { data, error } = await supabaseAdmin
    .from("notification_preferences")
    .update(updateData)
    .in("user_id", filteredUserIds)
    .select();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ 
    success: true, 
    updated_count: data?.length || 0,
    preferences: data 
  });
}
