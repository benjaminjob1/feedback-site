import { supabaseAdmin } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";
import { BEN_EMAIL } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const isPublic = searchParams.get("public") === "true";
  const { data: { user } } = await supabaseAdmin.auth.getUser();

  const client = supabaseAdmin;

  // Auto-create profile if missing
  if (user) {
    await client.from("profiles").upsert({
      id: user.id,
      email: user.email,
      role: user.email?.toLowerCase() === BEN_EMAIL.toLowerCase() ? "admin" : "user",
    }, { onConflict: "id" });
  }

  let query = client
    .from("feedback")
    .select("*, profiles(full_name, email)")
    .order("created_at", { ascending: false });

  if (isPublic) {
    query = query.eq("status", "approved");
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Filter for non-admin users
  let feedback = data || [];
  if (user) {
    const profileRes = await client.from("profiles").select("role").eq("id", user.id).single();
    const role = profileRes.data?.role;
    if (role !== "admin") {
      feedback = feedback.filter((f: any) => f.status === "approved" || f.submitted_by === user.id);
    }
  } else {
    feedback = feedback.filter((f: any) => f.status === "approved");
  }

  return NextResponse.json({ feedback });
}

export async function POST(req: NextRequest) {
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profileRes = await supabaseAdmin
    .from("profiles")
    .select("role, email_verified")
    .eq("id", user.id)
    .single();

  if (!profileRes.data?.email_verified) {
    return NextResponse.json({ error: "Please verify your email first" }, { status: 403 });
  }

  const body = await req.json();
  const { site, rating, question_easy, question_improve, question_bugs, question_features, question_other } = body;

  if (!site || !rating) {
    return NextResponse.json({ error: "Site and rating are required" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("feedback")
    .insert({
      site,
      rating,
      question_easy,
      question_improve,
      question_bugs,
      question_features,
      question_other,
      submitted_by: user.id,
      status: "pending",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ feedback: data });
}
