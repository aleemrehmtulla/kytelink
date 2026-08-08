import reactHooks from "eslint-plugin-react-hooks";
import { baseConfig } from "./index.js";

export const nextConfig = [
  ...baseConfig,
  {
    plugins: { "react-hooks": reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
    },
  },
  {
    files: [
      "pages/**/*.{ts,tsx}",
      "next.config.{js,ts}",
      "middleware.{ts,tsx}",
    ],
    rules: {
      "no-restricted-syntax": "off",
    },
  },
];
