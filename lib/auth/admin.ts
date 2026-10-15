import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createAuthClient, type AuthClient } from "@/lib/supabase/server";
import { checkAdmin, type AdminCheck } from "./check";
import { ADMIN_LOGIN } from "./routes";

/** One verified admin check per request (deduplicated across layout, page and components). */
export const getAdminCheck = cache(async (): Promise<AdminCheck> => checkAdmin(await createAuthClient()));

/**
 * For every admin page/component that reads admin data. Redirects instead of rendering when the
 * visitor is not a signed-in admin. Pages must call this themselves; layouts alone are not enough.
 */
export async function requireAdminPage(): Promise<{ user: { id: string; email: string | null }; supabase: AuthClient }> {
  const check = await getAdminCheck();
  if (check.status === "unauthenticated") redirect(ADMIN_LOGIN);
  if (check.status === "forbidden") redirect(`${ADMIN_LOGIN}?denied=1`);
  return { user: check.user, supabase: await createAuthClient() };
}

export type AdminActionGuard =
  | { ok: true; user: { id: string; email: string | null }; supabase: AuthClient }
  | { ok: false; error: "unauthenticated" | "forbidden" };

/**
 * MUST be the first call in every admin Server Action (mutation). Server Actions are public HTTP
 * endpoints, so hiding buttons is never protection. RLS in the database is the final barrier.
 */
export async function requireAdminAction(): Promise<AdminActionGuard> {
  const supabase = await createAuthClient();
  const check = await checkAdmin(supabase);
  if (check.status === "admin") return { ok: true, user: check.user, supabase };
  return { ok: false, error: check.status };
}
