import { supabaseAdmin } from "@/lib/supabase-admin";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { data: { user } } = await supabaseAdmin.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const callerProfile = await supabaseAdmin.from("profiles").select("role").eq("id", user.id).single();
  if (callerProfile.data?.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const body = await req.json();
  const { status } = body;

  if (!["pending", "approved", "rejected"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("feedback")
    .update({ status })
    .eq("id", params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ feedback: data });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { data: { user } } = await supabaseAdmin.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const callerProfile = await supabaseAdmin.from("profiles").select("role").eq("id", user.id).single();
  if (callerProfile.data?.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const { error } = await supabaseAdmin
    .from("feedback")
    .delete()
    .eq("id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
