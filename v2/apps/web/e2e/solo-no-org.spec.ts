import { test, expect } from "@playwright/test";
import { signInFresh, expectNoOrgJargon } from "./helpers";

test("a solo user never encounters an org concept across edit and analytics", async ({ page }) => {
  await signInFresh(page, "agent@kytelink.dev", "solo");
  await page.waitForURL(/\/edit/);

  await expect(page.getByRole("button", { name: "Add link" })).toBeVisible();
  await expectNoOrgJargon(page);

  const switcher = page.getByRole("button", { name: /Agent|Untitled|Side project/ }).first();
  await switcher.click();
  const menuText = (await page.locator("body").innerText()).toLowerCase();
  expect(menuText).not.toContain("new team");
  expect(menuText).toContain("new kytelink");
  await page.keyboard.press("Escape");

  await page.goto("/edit/design");
  await expect(page.getByRole("heading", { name: "Themes" })).toBeVisible();
  await expectNoOrgJargon(page);

  await page.goto("/edit/analytics");
  await expect(page.getByText("Total views")).toBeVisible();
  await expectNoOrgJargon(page);
});
