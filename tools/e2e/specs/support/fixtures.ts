import { test as base, expect, type BrowserContext, type Page } from "@playwright/test";
import { API_URL } from "./urls";

/**
 * dev-login (24-agents.md): mints a real better-auth session for a
 * @kytelink.dev address via the API and stores the signed cookie in the
 * browser context jar. Cookies are host-scoped, so the same localhost jar
 * serves both the web app (:4000) and the API (:4003).
 */
export async function devLogin(context: BrowserContext, email: string): Promise<string> {
  const res = await context.request.post(`${API_URL}/auth/dev-login`, { data: { email } });
  expect(res.ok(), `dev-login failed for ${email}: ${res.status()} ${await res.text()}`).toBeTruthy();
  const body = (await res.json()) as { ok: boolean; userId: string | null };
  expect(body.ok).toBeTruthy();
  return body.userId ?? "";
}

export async function fireBeacon(
  page: Page,
  kind: "page" | "link" | "event",
  payload: Record<string, unknown>,
): Promise<number> {
  return page.evaluate(
    async ({ base, k, p }) => {
      const res = await fetch(`${base}/t/${k}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(p),
        keepalive: true,
      });
      return res.status;
    },
    { base: API_URL, k: kind, p: payload },
  );
}

export const test = base;
export { expect };
