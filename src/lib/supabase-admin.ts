import "server-only";
import { createClient } from "@supabase/supabase-js";

// Server-only Supabase client using the secret key (sb_secret_...), which bypasses RLS.
// The "server-only" import makes the build fail if this module is ever imported from a client component.
// TEMPORARY: SUPABASE_SERVICE_ROLE_KEY is still read as a fallback so existing deployments keep
// working until SUPABASE_SECRET_KEY is set in Vercel. Remove it afterwards.
let _admin: ReturnType<typeof createClient> | null = null;

export function getSupabaseAdmin() {
  if (!_admin) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !secretKey) {
      throw new Error("Supabase admin client is not configured: set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY.");
    }
    _admin = createClient(url, secretKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _admin;
}

export const supabaseAdmin = {
  get auth() { return getSupabaseAdmin().auth; },
  from(table: string) { return getSupabaseAdmin().from(table); },
};
