import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth-server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const BEN_EMAIL = "benjamin.job@gwern.co.uk";

export async function POST(req: NextRequest) {
  const token = req.cookies.get("fb_session")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await verifySessionToken(token);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { email, full_name } = body;

  // Which profile to update
  const targetEmail = email && email !== payload.email.toLowerCase()
    ? email.toLowerCase()
    : payload.email.toLowerCase();

  // Only Ben can edit other users
  if (targetEmail !== payload.email.toLowerCase()) {
    if (payload.email.toLowerCase() !== BEN_EMAIL) {
      return NextResponse.json({ error: "Only Ben can manage other users" }, { status: 403 });
    }
  }

  // Look up profile by email
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("email", targetEmail)
    .single() as { data: { id: string } | null };

  if (!profile) {
    const { error: insertError } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: crypto.randomUUID(),
        email: targetEmail,
        full_name,
        role: payload.role,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
  } else {
    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({ full_name, updated_at: new Date().toISOString() })
      .eq("id", profile.id);
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
