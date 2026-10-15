import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/types/database";
import { supabaseEnv } from "./env";

/**
 * Per-request Supabase client acting as the signed-in user (session in HTTP-only-by-default
 * Supabase cookies). All queries run under that user's RLS policies. Never uses the service-role key.
 */
export async function createAuthClient() {
  const cookieStore = await cookies();
  const { url, key } = supabaseEnv();
  return createServerClient<Database>(url, key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component, where cookies are read-only; proxy.ts refreshes the session.
        }
      },
    },
  });
}

export type AuthClient = Awaited<ReturnType<typeof createAuthClient>>;
