import type { MetadataRoute } from "next";
import { resolveSiteUrl } from "@/lib/seo/site-url";

/** Public pages only. Empty until the site URL is known (absolute URLs are required). */
export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = resolveSiteUrl();
  if (!siteUrl) return [];
  return [
    { url: new URL("/", siteUrl).href, changeFrequency: "daily", priority: 1 },
    { url: new URL("/menu", siteUrl).href, changeFrequency: "daily", priority: 0.9 },
  ];
}
