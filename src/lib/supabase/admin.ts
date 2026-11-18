import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseUrl, supabaseServiceKey } from "@/lib/env";

/** Service role клиент: RLS-ийг алгасна. Зөвхөн эрхийг шалгасны дараа ашиглана. */
export function createAdminClient() {
  return createClient(
    supabaseUrl(),
    supabaseServiceKey(),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
