import type { NextConfig } from "next";

// Allow optimized images only from this project's public Supabase Storage objects.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const remotePatterns = supabaseUrl ? [new URL(`${supabaseUrl.replace(/\/+$/, "")}/storage/v1/object/public/**`)] : [];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    serverActions: {
      // Product photos (max 4 MB after in-browser shrinking, see lib/admin/image.ts) plus form
      // fields. Kept under Vercel's 4.5 MB request limit.
      bodySizeLimit: "4.4mb",
    },
  },
  images: {
    remotePatterns,
    qualities: [75],
    formats: ["image/avif", "image/webp"],
    // Uploaded images get a new file name on every change, so optimized copies can be kept long.
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
