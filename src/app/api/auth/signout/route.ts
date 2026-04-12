import { NextResponse } from "next/server";

export async function POST() {
  // Clear the session cookie — Supabase invalidates the token server-side
  const response = NextResponse.json({ success: true });
  response.cookies.set("fb_session", "", { path: "/", maxAge: 0 });
  return response;
}
