import type { NextConfig } from "next";

// Allow optimized images only from this project's public Supabase Storage objects.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const remotePatterns = supabaseUrl ? [new URL(`${supabaseUrl.replace(/\/+$/, "")}/storage/v1/object/public/**`)] : [];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    remotePatterns,
    qualities: [75],
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
