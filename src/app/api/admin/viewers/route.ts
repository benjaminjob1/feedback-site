import { supabaseAdmin } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { data: { user } } = await supabaseAdmin.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const callerProfile = await supabaseAdmin.from("profiles").select("role").eq("id", user.id).single();
  if (callerProfile.data?.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin
    .from("feedback_views")
    .select("*, profiles(full_name, email)")
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ views: data });
}

export async function POST(req: NextRequest) {
  const { data: { user } } = await supabaseAdmin.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const callerProfile = await supabaseAdmin.from("profiles").select("role").eq("id", user.id).single();
  if (callerProfile.data?.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

  const targetUser = await supabaseAdmin
    .from("profiles")
    .select("id, email_verified")
    .eq("email", email.toLowerCase())
    .single();

  if (!targetUser.data) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { data, error } = await supabaseAdmin
    .from("feedback_views")
    .upsert({
      user_id: targetUser.data.id,
      can_view_pending: true,
    }, { onConflict: "user_id" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ view: data });
}
