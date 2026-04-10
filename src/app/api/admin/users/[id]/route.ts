import { supabaseAdmin } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { data: { user } } = await supabaseAdmin.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const callerProfile = await supabaseAdmin.from("profiles").select("role").eq("id", user.id).single();
  if (callerProfile.data?.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const body = await req.json();
  const { role } = body;

  if (!["admin", "user", "viewer"].includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .update({ role, updated_at: new Date().toISOString() })
    .eq("id", params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ user: data });
}
