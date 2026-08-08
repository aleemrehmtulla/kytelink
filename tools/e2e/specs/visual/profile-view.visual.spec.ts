import { test, expect } from "@playwright/test";

// 17-quality "Visual regression": ProfileView across the 12 themes (9 legacy +
// 3 new) and the state variants {short, long-with-all-emoji-types, redirect,
// suspended, org-suspended}. Each row is a real seeded profile; together they
// cover every theme key and every render state without touching product code.
const PROFILES: { slug: string; theme: string; variant: string }[] = [
  { slug: "norm-default", theme: "default", variant: "short" },
  { slug: "norm-dark", theme: "dark", variant: "short" },
  { slug: "agency-space", theme: "spacegray", variant: "short" },
  { slug: "norm-pop", theme: "popsicle", variant: "short" },
  { slug: "norm-frog", theme: "froggy", variant: "short" },
  { slug: "norm-lav", theme: "lavender", variant: "short" },
  { slug: "norm-blue", theme: "gradientblue", variant: "short" },
  { slug: "norm-pink", theme: "gradientpink", variant: "short" },
  { slug: "aleem-demo", theme: "default", variant: "all-link-kinds" },
  { slug: "maxedout", theme: "paper", variant: "long-all-emoji-types" },
];

// The shell renders the same for both, but the two rows cover both scopes the
// payload can arrive with: the kyte's own verdict, and one inherited from its org.
const SHELLS: { slug: string; theme: string; variant: string }[] = [
  { slug: "suspended-demo", theme: "midnight", variant: "suspended" },
  { slug: "org-suspended-demo", theme: "dusk", variant: "org-suspended" },
];

test.describe("ProfileView visual baselines", () => {
  for (const p of PROFILES) {
    test(`profile ${p.slug} (${p.theme}/${p.variant})`, async ({ page }) => {
      await page.goto(`/${p.slug}`);
      const view = page.locator("[data-kytelink-profile-view]");
      await expect(view).toBeVisible({ timeout: 20000 });
      await page.evaluate(() => document.fonts?.ready);
      await expect(page).toHaveScreenshot(`${p.variant}--${p.slug}.png`, { fullPage: true });
    });
  }

  for (const s of SHELLS) {
    test(`blocked shell ${s.slug} (${s.variant})`, async ({ page }) => {
      await page.goto(`/${s.slug}`);
      await expect(page.getByRole("heading")).toBeVisible({ timeout: 20000 });
      await expect(page).toHaveScreenshot(`${s.variant}--${s.slug}.png`, { fullPage: true });
    });
  }
});
