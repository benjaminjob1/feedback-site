import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://lvrltmuhqejoetxubvxu.supabase.co";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "sb_publishable_vyqYqzXyx_2bHVzHJDBEgw_x3dARXaI";

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
export const BEN_EMAIL = "benjamin.job@gwern.co.uk";
