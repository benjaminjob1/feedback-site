import { createClient } from "@supabase/supabase-js";

// Build-time constants — hardcoded so they're always available during build
const FALLBACK_URL = "https://lvrltmuhqejoetxubvxu.supabase.co";
const FALLBACK_KEY = "sb_publishable_vyqYqzXyx_2bHVzHJDBEgw_x3dARXaI";

// Runtime env overrides (for local development), falling back to hardcoded values
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || FALLBACK_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || FALLBACK_KEY;

// Lazy singleton — only created when first accessed (avoids build-time errors)
let _supabase: ReturnType<typeof createClient> | null = null;

function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
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
] as const;
export type SiteValue = (typeof SITES)[number]["value"];
