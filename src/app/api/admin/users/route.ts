import { supabaseAdmin } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";
import { BEN_EMAIL } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { data: { user } } = await supabaseAdmin.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profileRes = await supabaseAdmin.from("profiles").select("role").eq("id", user.id).single();
  if (profileRes.data?.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ users: data });
}
