import { join } from "node:path";

const WORKSPACE_ROOT = join(import.meta.dirname, "../..");

const isProd = process.env.NODE_ENV === "production";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@kytelink/ui", "@kytelink/cdn", "@kytelink/schemas"],
  // Served under kytelink.com via the web app's multi-zone rewrite
  // (12-landing.md). Unset in dev — each app runs standalone on its own
  // port with no rewrite proxy in front (scripts/dev.mjs).
  assetPrefix: isProd ? "/landing-assets" : undefined,
  // Next refuses two dev servers sharing one distDir; a second session
  // (agent preview alongside `pnpm dev`) sets NEXT_DIST_DIR to coexist.
  distDir: process.env.NEXT_DIST_DIR || undefined,
  turbopack: {
    root: WORKSPACE_ROOT,
  },
  async headers() {
    return [
      {
        source: "/((?!landing-assets/|_next/|api/).*)",
        headers: [{ key: "vary", value: "Accept" }],
      },
    ];
  },
};

export default nextConfig;
