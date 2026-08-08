import { nextConfig } from "@kytelink/config/eslint/next";

export default [
  ...nextConfig,
  {
    // Node build-tooling scripts (bundle-size tripwire) run outside the app and
    // legitimately write to stdout.
    ignores: ["scripts/**"],
  },
  {
    rules: {
      // React-Compiler-only advisory; apps/web is not compiled with React
      // Compiler. Every hit is an idiomatic on-mount effect (hydrate session
      // from storage, read query params, fetch on mount) that this rule cannot
      // express without a data-fetching library.
      "react-hooks/set-state-in-effect": "off",
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@kytelink/db", "@kytelink/db/*"],
              message:
                "apps/web never imports packages/db directly — profile data flows through the API (doc 02).",
            },
          ],
        },
      ],
    },
  },
];
