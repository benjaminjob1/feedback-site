import { NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function GET(req: Request) {
  const ip = getClientIp(req);
  const { allowed, remaining, resetIn } = checkRateLimit(ip, 20);

  const hasKey = !!process.env.ANTHROPIC_API_KEY;
  return NextResponse.json({ aiAvailable: hasKey, rateLimit: { remaining, resetIn } });
}