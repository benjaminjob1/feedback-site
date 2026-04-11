import { SignJWT, jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "feedback-site-secret-change-in-production"
);

export interface SessionUser {
  email: string;
  role: "admin" | "viewer" | "user";
}

// In-memory OTP store (resets on server restart - fine for Vercel serverless)
const otpStore = new Map<string, { otp: string; expires: number }>();

export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function storeOTP(email: string, otp: string): void {
  otpStore.set(email.toLowerCase(), { otp, expires: Date.now() + 300000 }); // 5 min
}

export function verifyOTP(email: string, otp: string): boolean {
  const entry = otpStore.get(email.toLowerCase());
  if (!entry) return false;
  if (Date.now() > entry.expires) {
    otpStore.delete(email.toLowerCase());
    return false;
  }
  if (entry.otp !== otp) return false;
  otpStore.delete(email.toLowerCase());
  return true;
}

export async function createSessionToken(email: string, role: string): Promise<string> {
  return new SignJWT({ email, role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return { email: payload.email as string, role: payload.role as string };
  } catch {
    return null;
  }
}

// Hardcoded admin — same as stats dashboard approach
export const ADMIN_EMAIL = "benjamin.job@gwern.co.uk";

export function getUserRole(email: string): "admin" | "viewer" | "user" | null {
  const normalizedEmail = email.toLowerCase();
  if (normalizedEmail === ADMIN_EMAIL) return "admin";
  // Add other admins/viewers here as needed
  return null;
}
