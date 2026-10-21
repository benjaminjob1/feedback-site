import { createClient } from "@supabase/supabase-js";

// Supabase API keys (new key model):
// - NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: sb_publishable_... (browser-safe, RLS applies)
// - SUPABASE_SECRET_KEY: sb_secret_... (server only, see src/lib/supabase-admin.ts)
// Values come from environment variables only; nothing is hardcoded.
// NEXT_PUBLIC_* values must be referenced literally so Next.js can inline them at build time.
// TEMPORARY: the legacy variable name NEXT_PUBLIC_SUPABASE_ANON_KEY is still read as a fallback so
// existing deployments keep working until the new variable is set in Vercel. Remove it afterwards.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Lazy singleton — only created when first accessed (avoids build-time errors)
let _supabase: ReturnType<typeof createClient> | null = null;

function getSupabase() {
  if (!_supabase) {
    if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
      throw new Error(
        "Supabase is not configured: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY."
      );
    }
    _supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  }
  return _supabase;
}

export const supabase = new Proxy({} as ReturnType<typeof createClient>, {
  get(_target, prop) {
    return (getSupabase() as any)[prop];
  },
});

export const BEN_EMAIL = "benjamin.job@gwern.co.uk";
export const SITES = [
  { value: "hub", label: "Hub", emoji: "🖥️" },
  { value: "website", label: "Website", emoji: "🌐" },
  { value: "stats-native", label: "Stats", emoji: "📊" },
  { value: "stocks", label: "Stocks", emoji: "📈" },
  { value: "hardware", label: "Hardware", emoji: "🔧" },
  { value: "software", label: "Software", emoji: "💾" },
  { value: "railway", label: "Railway", emoji: "🚂" },
  { value: "feedback", label: "Feedback Portal", emoji: "📝" },
] as const;
export type SiteValue = (typeof SITES)[number]["value"];
