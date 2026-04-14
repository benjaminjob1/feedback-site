import { supabaseAdmin } from "@/lib/supabase-admin";
import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, createSessionToken } from "@/lib/auth-server";

export async function POST(req: NextRequest) {
  const token = req.cookies.get("fb_session")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await verifySessionToken(token);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Only admins can invite users
  const { data: adminProfile } = await supabaseAdmin
    .from("profiles")
    .select("id, role")
    .eq("email", payload.email.toLowerCase())
    .single();
  if (adminProfile?.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const { email, role } = await req.json();
  if (!email || !role) return NextResponse.json({ error: "Email and role required" }, { status: 400 });

  // Upsert the user into profiles
  const { data: profile, error: upsertError } = await supabaseAdmin
    .from("profiles")
    .upsert({
      id: crypto.randomUUID(),
      email: email.toLowerCase(),
      role,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "email" })
    .select()
    .single();

  if (upsertError) return NextResponse.json({ error: upsertError.message }, { status: 500 });

  // Get admin's default notification preferences
  const { data: adminSettings } = await supabaseAdmin
    .from("admin_settings")
    .select("default_notify_new_feedback, default_notify_edited_feedback")
    .eq("admin_user_id", adminProfile!.id)
    .single();

  // Create notification preferences for new user with admin's defaults
  await supabaseAdmin
    .from("notification_preferences")
    .upsert({
      user_id: profile.id,
      notify_new_feedback: adminSettings?.default_notify_new_feedback ?? false,
      notify_edited_feedback: adminSettings?.default_notify_edited_feedback ?? false,
    }, { onConflict: "user_id" });

  // Generate a magic link for this user
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://feedback.benjob.me";
  const sessionToken = await createSessionToken(email.toLowerCase(), role);
  const loginUrl = `${siteUrl}/api/auth/verify-otp?token=${sessionToken}`;

  const subject = "You've been invited to leave feedback on Ben's projects";
  const text = `You've been invited to share feedback on Ben's projects!\n\nClick below to sign in and start:\n\n${loginUrl}\n\nThis link expires in 7 days.`;

  await fetch("https://api.agentmail.to/v0/inboxes/bensbot@agentmail.to/messages/send", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.AGENTMAIL_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ to: email.toLowerCase(), subject, text }),
  });

  return NextResponse.json({ user: profile, success: true });
}
