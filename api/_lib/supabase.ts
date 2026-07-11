import { createClient } from "@supabase/supabase-js";

const supabaseUrl = (process.env.VITE_SUPABASE_URL || "").replace(/\/rest\/v1|\/auth\/v1$/, "");
const supabaseServiceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").replace(/^["']|["']$/g, "");

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_URL");
}

export const supabaseService = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
      autoRefreshToken: false,
      persistSession: false
  }
});
