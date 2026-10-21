/** @type {import('next').NextConfig} */
const nextConfig = {
  // Fully static client-side app: `next build` emits a static site into `out/`,
  // which Netlify serves directly. No Next.js server runtime is required.
  output: 'export',
  reactStrictMode: true,
  images: {
    // next/image optimization needs a server; this app ships plain assets only.
    unoptimized: true,
  },
  // Trailing slashes keep static hosting + service-worker scope predictable.
  trailingSlash: true,
};

export default nextConfig;
