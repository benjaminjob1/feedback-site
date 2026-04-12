import { NextResponse } from "next/server";

export async function GET() {
  const hasKey = !!process.env.ANTHROPIC_API_KEY;
  return NextResponse.json({ aiAvailable: hasKey });
}