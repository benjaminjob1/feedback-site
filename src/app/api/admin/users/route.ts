import { supabaseAdmin } from "@/lib/supabase-admin";
import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth-server";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("fb_session")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await verifySessionToken(token);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Only admins can list users
  if (payload.role !== "admin") {
    // Look up profile to confirm role
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("email", payload.email.toLowerCase())
      .single();
    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }
  }

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ users: data });
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get("fb_session")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await verifySessionToken(token);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Only existing admins can add users
  const { data: adminProfile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("email", payload.email.toLowerCase())
    .single();
  if (adminProfile?.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const { email, role } = await req.json();
  if (!email || !role) return NextResponse.json({ error: "Email and role required" }, { status: 400 });

  // Upsert the user into profiles
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .upsert({
      email: email.toLowerCase(),
      role,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "email" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ user: data });
}
