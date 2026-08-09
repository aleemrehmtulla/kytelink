import { cp, mkdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
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
// runtime relative to the bundled module (dist/fonts/geist-regular.ttf), and
// the bundled clickhouse migrator reads its SQL from dist/migrations.
await mkdir("dist/fonts", { recursive: true });
await cp("src/assets/fonts", "dist/fonts", { recursive: true });
await cp("../../packages/clickhouse/migrations", "dist/migrations", { recursive: true });

// The API deploy owns pushing packages/cdn/assets to the bucket (prod builds on
// Render, where the S3 env is already set for uploads). Skips when S3 is not
// configured — self-hosters without S3 still build (SELF-HOSTING.md capability
// matrix), and CI's plain `pnpm -w build` has no bucket env.
const s3Env = ["AWS_S3_BUCKET", "AWS_ENDPOINT_URL", "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY"];
if (s3Env.every((key) => process.env[key]?.trim())) {
  execFileSync("pnpm", ["--filter", "@kytelink/cdn", "sync"], {
    cwd: "../..",
    stdio: "inherit",
  });
} else {
  process.stdout.write("cdn sync skipped — S3 env not configured\n");
}
