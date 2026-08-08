import { cp, mkdir } from "node:fs/promises";
import { build } from "esbuild";

await build({
  entryPoints: ["src/index.ts"],
  outfile: "dist/index.js",
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  sourcemap: true,
  banner: {
    js: [
      `import { createRequire as __nodeCreateRequire } from "node:module";`,
      `import { fileURLToPath as __nodeFileURLToPath } from "node:url";`,
      `import { dirname as __nodeDirname } from "node:path";`,
      `const require = __nodeCreateRequire(import.meta.url);`,
      `const __filename = __nodeFileURLToPath(import.meta.url);`,
      `const __dirname = __nodeDirname(__filename);`,
    ].join("\n"),
  },
  external: [
    "fastify",
    "pino",
    "@trpc/server",
    "@trpc/server/*",
    "sharp",
    "@resvg/resvg-js",
    "satori",
    "better-auth",
    "better-auth/*",
    "@prisma/client",
    ".prisma/client",
    "bullmq",
    "ioredis",
    "@aws-sdk/*",
    "openai",
    "react",
    "react/jsx-runtime",
    "react-dom",
    "@react-email/*",
  ],
});

// esbuild does not carry static assets; satori loads the og-image font at
// runtime relative to the bundled module (dist/fonts/geist-regular.ttf).
await mkdir("dist/fonts", { recursive: true });
await cp("src/assets/fonts", "dist/fonts", { recursive: true });
