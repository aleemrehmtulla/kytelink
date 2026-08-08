import { describe, expect, it } from "vitest";
import { ogCardColorsFor } from "./theme-colors";

describe("ogCardColorsFor", () => {
  it("resolves a solid-bg theme to a real hex color, not a Chakra token", () => {
    const colors = ogCardColorsFor("default");
    expect(colors.background).toBe("#FFFFFF");
  });

  it("resolves a gradient theme to a CSS linear-gradient with real hex stops", () => {
    const colors = ogCardColorsFor("gradientblue");
    expect(colors.background).toMatch(/^linear-gradient\(to top, #[0-9A-F]{6}, #[0-9A-F]{6}\)$/);
  });

  it("resolves every theme key without throwing", () => {
    const keys = [
      "default",
      "dark",
      "spacegray",
      "popsicle",
      "froggy",
      "lavender",
      "gradientblue",
      "gradientpink",
      "gradientgreen",
      "midnight",
      "dusk",
      "paper",
    ] as const;
    for (const key of keys) {
      const colors = ogCardColorsFor(key);
      expect(colors.background.length).toBeGreaterThan(0);
    }
  });
});
