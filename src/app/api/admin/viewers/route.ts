import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { BEN_EMAIL } from "@/lib/supabase";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function adminClient() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function POST(req: NextRequest) {
  const { data: { user } } = await createClient(
    supabaseUrl,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ).auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = adminClient();
  const profileRes = await client.from("profiles").select("role").eq("id", user.id).single();
  if (profileRes.data?.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const body = await req.json();
  const { email } = body;

  if (!email) {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }

  if (email.toLowerCase() === BEN_EMAIL.toLowerCase()) {
    return NextResponse.json({ error: "Cannot add Ben as viewer" }, { status: 400 });
  }

  // Find user by email in profiles
  const existingRes = await client
    .from("profiles")
    .select("*")
    .eq("email", email)
    .single();

  if (existingRes.data) {
    const { error } = await client
      .from("profiles")
      .update({ role: "viewer" })
      .eq("id", existingRes.data.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ user: { ...existingRes.data, role: "viewer" } });
  }

  return NextResponse.json({ error: "No user found with that email. They must sign up first." }, { status: 404 });
}
