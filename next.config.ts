import type { NextConfig } from "next";

// Static export: the game is 100% client-side, so Netlify serves plain files
// from `out/`. No server, no secrets, works offline after the first visit.
const nextConfig: NextConfig = {
  output: "export",
  reactStrictMode: true,
  images: { unoptimized: true },
};

export default nextConfig;
