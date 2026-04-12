import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth-server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("fb_session")?.value;
  if (!token) return NextResponse.json({ user: null });

  // Verify our custom JWT session token
  const payload = await verifySessionToken(token);
  if (!payload) return NextResponse.json({ user: null });

  // Look up profile by email to get the user's id
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name, role, email_verified")
    .eq("email", payload.email.toLowerCase())
    .single();

  return NextResponse.json({
    user: profile
      ? {
          id: profile.id,
          email: payload.email,
          role: profile.role || payload.role,
          full_name: profile.full_name || "",
          email_verified: profile.email_verified || false,
        }
      : {
          // Fallback: create a minimal user from the token
          id: null,
          email: payload.email,
          role: payload.role,
          full_name: "",
          email_verified: false,
        },
  });
}
