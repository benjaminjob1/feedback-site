import { createClient } from "@supabase/supabase-js";

// Build-time constants — hardcoded so they're always available
const SUPABASE_URL = "https://lvrltmuhqejoetxubvxu.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_vyqYqzXyx_2bHVzHJDBEgw_x3dARXaI";

// Runtime env overrides (for local development)
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? SUPABASE_ANON_KEY;

export const supabase = createClient(url, key);

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
