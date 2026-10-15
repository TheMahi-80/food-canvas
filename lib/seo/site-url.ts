/**
 * Absolute site URL for metadata, sitemap and structured data.
 * NEXT_PUBLIC_SITE_URL (set it once the real domain exists) wins; on Vercel the production
 * domain Vercel provides is used as a fallback. Returns null when neither is a valid https URL
 * (local development), in which case absolute-URL features are left out instead of guessed.
 */
export function resolveSiteUrl(
  // Read each variable directly so Next.js can inline NEXT_PUBLIC_* at build time.
  env: { NEXT_PUBLIC_SITE_URL?: string; VERCEL_PROJECT_PRODUCTION_URL?: string } = {
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL,
  },
): URL | null {
  const candidates = [env.NEXT_PUBLIC_SITE_URL?.trim(), env.VERCEL_PROJECT_PRODUCTION_URL?.trim() && `https://${env.VERCEL_PROJECT_PRODUCTION_URL.trim()}`];
  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      const url = new URL(candidate);
      if (url.protocol === "https:" || url.hostname === "localhost") return new URL(url.origin);
    } catch {
      // ignore malformed values
    }
  }
  return null;
}
