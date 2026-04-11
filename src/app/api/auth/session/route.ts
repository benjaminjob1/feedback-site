import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth-server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("fb_session")?.value;
    if (!token) {
      return NextResponse.json({ user: null });
    }

    const user = await verifySessionToken(token);
    return NextResponse.json({ user });
  } catch (error: any) {
    console.error("[session] Error:", error.message);
    return NextResponse.json({ user: null });
  }
}

export async function DELETE(req: NextRequest) {
  const response = NextResponse.json({ success: true });
  response.cookies.delete("fb_session");
  return response;
}
