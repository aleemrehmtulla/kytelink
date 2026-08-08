import { join } from "node:path";

const WORKSPACE_ROOT = join(import.meta.dirname, "../..");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Next refuses two dev servers sharing one distDir; a second session
  // (agent preview alongside `pnpm dev`) sets NEXT_DIST_DIR to coexist.
  distDir: process.env.NEXT_DIST_DIR || undefined,
  transpilePackages: ["@kytelink/schemas", "@kytelink/trpc", "@kytelink/ui"],
  turbopack: {
    root: WORKSPACE_ROOT,
  },
  async redirects() {
    return [{ source: "/", destination: "/overview", permanent: false }];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

export default nextConfig;
