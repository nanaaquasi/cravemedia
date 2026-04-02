import type { NextConfig } from "next";
import { withSerwist } from "@serwist/turbopack";

/** Allow next/image for Supabase Storage (profile avatars, etc.) */
function supabaseImagePattern(): {
  protocol: "https";
  hostname: string;
  pathname: string;
} | null {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!raw) return null;
  try {
    const host = new URL(raw).hostname;
    if (!host) return null;
    return {
      protocol: "https",
      hostname: host,
      pathname: "/storage/v1/object/**",
    };
  } catch {
    return null;
  }
}

const supabaseStorageImagePattern = supabaseImagePattern();

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
  images: {
    remotePatterns: [
      ...(supabaseStorageImagePattern ? [supabaseStorageImagePattern] : []),
      {
        protocol: "https",
        hostname: "image.tmdb.org",
        pathname: "/t/p/**",
      },
      {
        protocol: "https",
        hostname: "books.google.com",
        pathname: "/books/**",
      },
      {
        protocol: "https",
        hostname: "covers.openlibrary.org",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "s4.anilist.co",
      },
    ],
  },
};

export default withSerwist(nextConfig);
