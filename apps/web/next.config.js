import { join } from "node:path";

const WORKSPACE_ROOT = join(import.meta.dirname, "../..");

const agentMode = process.env.AGENT_MODE === "true";
const defaultApiUrl = agentMode ? "http://localhost:4003" : "http://localhost:3003";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Next refuses two dev servers sharing one distDir; a second session
  // (agent preview alongside `pnpm dev`) sets NEXT_DIST_DIR to coexist.
  distDir: process.env.NEXT_DIST_DIR || undefined,
  transpilePackages: ["@kytelink/ui", "@kytelink/cdn", "@kytelink/schemas", "@kytelink/trpc"],
  // Inline agent-aware defaults so `pnpm agents` (api on :4003) works with no
  // extra env wiring, while an explicit NEXT_PUBLIC_API_URL still wins.
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? defaultApiUrl,
    AGENT_MODE: process.env.AGENT_MODE ?? "false",
  },
  turbopack: {
    root: WORKSPACE_ROOT,
  },
  // www→apex lives here, not in middleware — the middleware matcher skips
  // /_next, /login, /edit and every dotted path.
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.kytelink.com" }],
        destination: "https://kytelink.com/:path*",
        statusCode: 301,
      },
    ];
  },
  // Serve the SEO sitemap + robots from the web zone. `.xml`/`.txt` paths bypass
  // the host-routing middleware (matcher excludes dotted paths), so these map
  // straight to the seo api handlers, which read the worker-generated files from
  // the bucket and fall back to a minimal valid document.
  async rewrites() {
    return {
      beforeFiles: [
        { source: "/sitemap.xml", destination: "/api/seo/sitemap" },
        { source: "/sitemap-:id(\\d+).xml", destination: "/api/seo/sitemap?file=sitemap-:id.xml" },
        { source: "/robots.txt", destination: "/api/seo/robots" },
      ],
    };
  },
};

export default nextConfig;
