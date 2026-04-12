import { SignJWT, jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "feedback-site-secret-change"
);

export interface SessionUser {
  email: string;
  role: "admin" | "viewer" | "user";
}

// Generate a signed OTP token — stateless, works across all serverless instances
export async function createOTTToken(email: string, role: string): Promise<string> {
  return new SignJWT({ email, role, type: "ott" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(JWT_SECRET);
}

export async function verifyOTTToken(token: string): Promise<{ email: string; role: string } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (payload.type !== "ott") return null;
    return { email: payload.email as string, role: payload.role as string };
  } catch {
    return null;
  }
}

export async function createSessionToken(email: string, role: string): Promise<string> {
  return new SignJWT({ email, role, type: "session" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (payload.type !== "session") return null;
    return { email: payload.email as string, role: payload.role as "admin" | "viewer" | "user" };
  } catch {
    return null;
  }
}

export const ADMIN_EMAIL = "benjamin.job@gwern.co.uk";

export function getUserRole(email: string): "admin" | "viewer" | "user" | null {
  const normalizedEmail = email.toLowerCase();
  if (normalizedEmail === ADMIN_EMAIL) return "admin";
  return null;
}
