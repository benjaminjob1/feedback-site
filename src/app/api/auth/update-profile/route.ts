import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth-server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  const token = req.cookies.get("fb_session")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await verifySessionToken(token);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { full_name } = body;

  // Look up profile by email
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("email", payload.email.toLowerCase())
    .single();

  if (!profile) {
    // Create profile if it doesn't exist (first-time setup)
    const { error: insertError } = await supabaseAdmin
      .from("profiles")
      .insert({
        email: payload.email.toLowerCase(),
        full_name,
        role: payload.role,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
  } else {
    // Update existing profile
    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({ full_name, updated_at: new Date().toISOString() })
      .eq("id", profile.id);
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
