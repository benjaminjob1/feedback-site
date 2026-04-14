import { supabaseAdmin } from "@/lib/supabase-admin";
import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth-server";

type AdminSettings = {
  id: string;
  admin_user_id: string;
  notify_new_user_signup: boolean;
  default_notify_new_feedback: boolean;
  default_notify_edited_feedback: boolean;
  created_at: string;
  updated_at: string;
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

  // Get admin settings
  const { data, error } = await supabaseAdmin
    .from("admin_settings")
    .select("*")
    .eq("admin_user_id", profile.id)
    .single();

  if (error && error.code !== "PGRST116") {
    // Error other than "no rows returned"
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // If no settings exist, create default
  if (!data) {
    const { data: newSettings, error: insertError } = await supabaseAdmin
      .from("admin_settings")
      .upsert({ admin_user_id: profile.id }, { onConflict: "admin_user_id" })
      .select()
      .single();

    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
    return NextResponse.json({ settings: newSettings });
  }

  return NextResponse.json({ settings: data });
}

export async function PATCH(req: NextRequest) {
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

  const body = await req.json();
  const { notify_new_user_signup, default_notify_new_feedback, default_notify_edited_feedback } = body;

  // Build update data
  const updateData: Partial<AdminSettings> = { updated_at: new Date().toISOString() };
  if (typeof notify_new_user_signup === "boolean") updateData.notify_new_user_signup = notify_new_user_signup;
  if (typeof default_notify_new_feedback === "boolean") updateData.default_notify_new_feedback = default_notify_new_feedback;
  if (typeof default_notify_edited_feedback === "boolean") updateData.default_notify_edited_feedback = default_notify_edited_feedback;

  // Upsert settings
  const { data, error } = await supabaseAdmin
    .from("admin_settings")
    .upsert({ 
      admin_user_id: profile.id,
      ...updateData
    }, { onConflict: "admin_user_id" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ settings: data });
}
