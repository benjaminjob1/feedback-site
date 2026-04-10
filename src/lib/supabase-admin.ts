import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = "https://lvrltmuhqejoetxubvxu.supabase.co";

let _adminClient: SupabaseClient | null = null;

function getAdminClient(): SupabaseClient {
  if (!_adminClient) {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "sb_publishable_vyqYqzXyx_2bHVzHJDBEgw_x3dARXaI";
    _adminClient = createClient(supabaseUrl, key);
  }
  return _adminClient;
}

export const supabaseAdmin = {
  from: (table: string) => getAdminClient().from(table),
  auth: {
    getUser: () => getAdminClient().auth.getUser(),
  },
};

export const BEN_EMAIL = "benjamin.job@gwern.co.uk";
