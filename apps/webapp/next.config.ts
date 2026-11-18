import type { NextConfig } from "next";

/**
 * Static security headers for every response. The Content-Security-Policy (with a
 * per-request nonce) is set in proxy.ts. Same baseline as apps/website, plus noindex:
 * the portal must never appear in search results.
 */
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  output: "standalone",
  // Workspace packages are TypeScript source.
  transpilePackages: ["@dd/shared"],
  // Uploads (question papers, assignments, gallery photos) go through server actions.
  experimental: { serverActions: { bodySizeLimit: "11mb" } },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [],
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Reset/activation links carry a secret: never leak it through the Referer header.
      { source: "/reset-password", headers: [{ key: "Referrer-Policy", value: "no-referrer" }] },
      { source: "/api/:path*", headers: [{ key: "Cache-Control", value: "no-store" }] },
    ];
  },
};

export default nextConfig;
