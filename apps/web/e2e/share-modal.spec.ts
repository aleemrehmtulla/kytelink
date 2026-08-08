import { test, expect } from "@playwright/test";
import { signInFresh } from "./helpers";

// M2 regression: the ShareKyteModal offers the profile URL across the SHARE_DOMAINS
// (kytelink.com / kyte.bio / kyte.lol) and share-intent links. The agent kyte's
// username is "agent".
test.describe("ShareKyteModal", () => {
  test("renders and emits correct per-domain URLs and share targets", async ({ page }) => {
    await signInFresh(page, "agent@kytelink.dev", "solo");
    await page.waitForURL(/\/edit/);

    await page.getByRole("button", { name: "Share" }).click();

    const url = page.getByTestId("share-url");
    await expect(url).toBeVisible();
    await expect(url).toHaveValue("https://kytelink.com/agent");

    await page.getByRole("button", { name: "kyte.bio", exact: true }).click();
    await expect(url).toHaveValue("https://kyte.bio/agent");

    await page.getByRole("button", { name: "kyte.lol", exact: true }).click();
    await expect(url).toHaveValue("https://kyte.lol/agent");

    // Share intents carry the currently-selected (kyte.lol) URL, encoded.
    const encoded = encodeURIComponent("https://kyte.lol/agent");
    await expect(page.getByTestId("share-twitter")).toHaveAttribute("href", new RegExp(encoded));
    await expect(page.getByTestId("share-whatsapp")).toHaveAttribute("href", new RegExp(encoded));
    await expect(page.getByTestId("share-linkedin")).toHaveAttribute("href", new RegExp(encoded));
    await expect(page.getByTestId("share-email")).toHaveAttribute("href", /^mailto:/);
  });
});
