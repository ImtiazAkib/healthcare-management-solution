import type { NextConfig } from 'next';

const production = process.env.NODE_ENV === 'production';

/*
  `output: 'standalone'` exists for the PM2 deployment, which runs
  `.next/standalone/server.js`. Vercel traces and packages the output itself, and there
  the standalone copy step dies on a missing `.next/next-server.js.nft.json`. The option
  buys nothing on Vercel, so it is left off when VERCEL is set — which Vercel does on
  every build.
*/
const selfHosted = !process.env.VERCEL;

const nextConfig: NextConfig = {
  // build optimizations
  output: selfHosted ? 'standalone' : undefined,
  poweredByHeader: false,
  reactStrictMode: true,

  /*
    A `<Link>` to a route that does not exist yet is a build error rather than a 404 found
    by a visitor. That is why `ROUTES` currently holds only `HOME` and the landing page
    navigates by in-page anchor — every other route arrives with the step that builds it.
  */
  typedRoutes: true,

  images: {
    deviceSizes: [640, 768, 1024, 1280, 1536, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    qualities: [25, 50, 75, 100],
  },

  compiler: {
    // Keep errors and warnings in production; drop the rest.
    removeConsole: production ? { exclude: ['error', 'warn'] } : false,
  },
};

export default nextConfig;
