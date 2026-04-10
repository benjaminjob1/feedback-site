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

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
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

  const targetRes = await client.from("profiles").select("email").eq("id", params.id).single();
  if (targetRes.data?.email?.toLowerCase() === BEN_EMAIL.toLowerCase()) {
    return NextResponse.json({ error: "Cannot modify Ben's role" }, { status: 403 });
  }

  const body = await req.json();
  const { role } = body;

  if (!["user", "viewer"].includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const { error } = await client
    .from("profiles")
    .update({ role })
    .eq("id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
