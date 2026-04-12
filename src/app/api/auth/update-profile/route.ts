import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/verify-session";

export async function POST(req: NextRequest) {
  // Get session from cookie
  const token = req.cookies.get("fb_session")?.value;
  if (!token) return NextResponse.json({ user: null });

  const supabaseUrl = "https://lvrltmuhqejoetxubvxu.supabase.co";
  const supabaseKey = "sb_publishable_vyqYqzXyx_2bHVzHJDBEgw_x3dARXaI";

  const res = await fetch(`${supabaseUrl}/auth/v1/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: supabaseKey,
    },
  });

  const user = await res.json();
  if (!user?.id) return NextResponse.json({ user: null });

  // Update user metadata
  const body = await req.json();
  const { full_name } = body;

  const updateRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${user.id}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      apikey: supabaseKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      user_metadata: { ...user.user_metadata, full_name },
    }),
  });

  const updated = await updateRes.json();
  if (updated.error) return NextResponse.json({ error: updated.error.message }, { status: 500 });
  return NextResponse.json({ user: updated });
}
