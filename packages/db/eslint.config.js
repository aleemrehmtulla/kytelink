import { baseConfig } from "@kytelink/config/eslint";

export default [
  ...baseConfig,
  {
    ignores: ["src/generated/**"],
  },
];
