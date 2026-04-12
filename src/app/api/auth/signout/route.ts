import { NextResponse } from "next/server";

export async function POST() {
  // Clear the session cookie — that's all we need to do
  // Supabase will invalidate the token on next request
  const response = NextResponse.json({ success: true });
  response.cookies.set("fb_session", "", { path: "/", maxAge: 0 });
  return response;
}
