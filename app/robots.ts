import type { MetadataRoute } from "next";
import { resolveSiteUrl } from "@/lib/seo/site-url";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = resolveSiteUrl();
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/admin" },
    ...(siteUrl ? { sitemap: new URL("/sitemap.xml", siteUrl).href, host: siteUrl.origin } : {}),
  };
}
