import { createClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL, assertEnv } from "@/lib/env";

/** Cliente anónimo, sin cookies: solo puede leer lo que las políticas RLS permiten al público. */
export function createPublicClient() {
  assertEnv();
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
