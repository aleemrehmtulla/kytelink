import { tailwindPreset } from "@kytelink/config/tailwind";
import type { Config } from "tailwindcss";

const config: Config = {
  presets: [tailwindPreset],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./hooks/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
};

export default config;
