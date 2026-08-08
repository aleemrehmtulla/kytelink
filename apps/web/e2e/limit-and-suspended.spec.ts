import { test, expect } from "@playwright/test";
import { signInFresh } from "./helpers";

function futureLocal(days: number): string {
  const at = new Date(Date.now() + days * 86_400_000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}T${pad(at.getHours())}:${pad(at.getMinutes())}`;
}

test("hitting a limit shows the contact-Aleem modal", async ({ page }) => {
  await signInFresh(page, "agent@kytelink.dev", "solo");
  await page.waitForURL(/\/edit/);

  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await page.getByRole("menuitem", { name: /Schedule/ }).click();
  const field = page.locator('input[type="datetime-local"]');
  const schedule = page.getByRole("button", { name: "Schedule", exact: true });
  for (let i = 1; i <= 4; i += 1) {
    await field.fill(futureLocal(i));
    await schedule.click();
    await page.waitForTimeout(120);
  }

  await expect(page.getByText(/You've hit the limit on scheduled publishes\./)).toBeVisible();
  await expect(page.getByRole("button", { name: "Message Aleem on X" })).toBeVisible();
});

test("scheduling in the past offers a publish-now confirm instead of an error", async ({ page }) => {
  await signInFresh(page, "agent@kytelink.dev", "solo");
  await page.waitForURL(/\/edit/);

  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await page.getByRole("menuitem", { name: /Schedule/ }).click();
  await page.locator('input[type="datetime-local"]').fill(futureLocal(-2));
  await page.getByRole("button", { name: "Schedule", exact: true }).click();

  await expect(page.getByText(/That time has already passed/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Publish now" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Pick another time" })).toBeVisible();
});

test("a suspended kyte locks the editor", async ({ page }) => {
  await signInFresh(page, "agent@kytelink.dev", "team");
  await page.waitForURL(/\/edit/);
  await page.goto("/edit/links?kyte=kyte_acme_suspended");
  await expect(page.getByRole("heading", { name: "This page is suspended" })).toBeVisible();
  await expect(page.getByText("Impersonating a delivery company.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Appeal this suspension" })).toHaveAttribute(
    "href",
    /\/appeal\?kind=kyte&handle=acme-flagged/,
  );
});

test("the team tab empty state is jargon-free for a solo team", async ({ page }) => {
  await signInFresh(page, "agent@kytelink.dev", "solo");
  await page.waitForURL(/\/edit/);
  await page.goto("/edit/team");
  await expect(
    page.getByText("Working with someone? Invite them to help manage this page."),
  ).toBeVisible();
});
