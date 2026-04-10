import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://lvrltmuhqejoetxubvxu.supabase.co";
const supabaseAnonKey = "sb_publishable_vyqYqzXyx_2bHVzHJDBEgw_x3dARXaI";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
