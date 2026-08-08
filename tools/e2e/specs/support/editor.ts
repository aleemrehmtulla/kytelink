import type { Page } from "@playwright/test";

// Everything under the Publish split-button lives in a Radix dropdown, which is
// only in the DOM while open — every entry point has to go through the trigger.
export async function openPublishMenu(page: Page, item: string | RegExp): Promise<void> {
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await page.getByRole("menuitem", { name: item }).click();
}

/** `datetime-local` takes wall-clock text, so build it in the browser's zone. */
export function localDateTime(offsetMs: number): string {
  const at = new Date(Date.now() + offsetMs);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}T${pad(at.getHours())}:${pad(at.getMinutes())}`;
}
