import { baseConfig } from "@kytelink/config/eslint";

export default [
  ...baseConfig,
  {
    rules: {
      "no-console": "off",
    },
  },
];
