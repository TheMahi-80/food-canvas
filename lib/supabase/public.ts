import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { supabaseEnv } from "./env";

/**
 * Server-side Supabase client with the publishable key and no user session.
 * It can only do what RLS allows anonymous visitors to do: read the public menu.
 */
export function createPublicClient() {
  const { url, key } = supabaseEnv();
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
