import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { adminRouteDecision } from "@/lib/auth/routes";

/**
 * First protection layer for /admin: refreshes the Supabase session cookie and sends visitors
 * without a valid session to the login page. Admin status is re-checked on the server by every
 * admin page and Server Action, and enforced by RLS in the database.
 */
export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  let response = NextResponse.next({ request });
  let hasSession = false;

  if (url && key) {
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list) => {
          list.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    });
    // Verifies the JWT (signature + expiry), refreshing it if needed.
    const { data } = await supabase.auth.getClaims();
    hasSession = Boolean(data?.claims?.sub);
  }

  const decision = adminRouteDecision(request.nextUrl.pathname, request.nextUrl.search, hasSession);
  if (decision.type === "redirect") {
    const redirect = NextResponse.redirect(new URL(decision.to, request.url));
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    response = redirect;
  }

  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
