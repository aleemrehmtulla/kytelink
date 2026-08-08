import { tailwindPreset } from "@kytelink/config/tailwind";
import type { Config } from "tailwindcss";

const config: Config = {
  presets: [tailwindPreset],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "../../packages/ui/src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Admin runs on a pure-white canvas rather than the shared #FAFAFC:
        // separation comes from hairline borders alone. Interaction surfaces
        // are violet-tinted (never grey) so a hover never reads as a disabled
        // grey block against the white.
        canvas: "#FFFFFF",
        tint: {
          DEFAULT: "#F7F5FE",
          hover: "#F1EEFD",
        },
      },
    },
  },
};

export default config;
