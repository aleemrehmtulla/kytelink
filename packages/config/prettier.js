import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

export default {
  semi: true,
  singleQuote: false,
  trailingComma: "all",
  printWidth: 90,
  tabWidth: 2,
  plugins: [require.resolve("prettier-plugin-tailwindcss")],
};
