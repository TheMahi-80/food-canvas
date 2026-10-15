/**
 * Admin authorization decision, kept free of Next.js/cookie code so it can be unit-tested with fakes.
 * Identity comes from supabase.auth.getUser() (verified by the Supabase Auth server, not just a
 * cookie decode); admin status from the is_admin() database function (public.admin_users).
 * Fails closed: any error means "not an admin".
 */
export type AdminCheck =
  | { status: "unauthenticated" }
  | { status: "forbidden"; email: string | null }
  | { status: "admin"; user: { id: string; email: string | null } };

export interface AdminCheckClient {
  auth: {
    getUser: () => Promise<{ data: { user: { id: string; email?: string | null } | null }; error: unknown }>;
  };
  rpc: (fn: "is_admin") => PromiseLike<{ data: boolean | null; error: unknown }>;
}

export async function checkAdmin(client: AdminCheckClient): Promise<AdminCheck> {
  let user: { id: string; email?: string | null } | null = null;
  try {
    const { data, error } = await client.auth.getUser();
    if (!error) user = data.user;
  } catch {
    user = null;
  }
  if (!user) return { status: "unauthenticated" };

  try {
    const { data, error } = await client.rpc("is_admin");
    if (error || data !== true) return { status: "forbidden", email: user.email ?? null };
  } catch {
    return { status: "forbidden", email: user.email ?? null };
  }
  return { status: "admin", user: { id: user.id, email: user.email ?? null } };
}
