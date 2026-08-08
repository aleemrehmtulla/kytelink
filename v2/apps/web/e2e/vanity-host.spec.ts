import { test, expect } from "@playwright/test";

// M1 regression: founder-owned vanity domains (kyte.bio / kyte.lol / yoyo.so /
// downsad.com). Root redirects to the kytelink.com apex; any other path is a
// username alias and serves that profile. Driven via the Host header against the
// running mock server (vanity handling never touches the owner-lookup API).
test.describe("vanity host routing", () => {
  test("root path on a vanity host redirects to the kytelink.com apex", async ({ request }) => {
    const response = await request.get("http://localhost:3000/", {
      headers: { host: "kyte.bio" },
      maxRedirects: 0,
    });
    expect([301, 302, 307, 308]).toContain(response.status());
    expect(response.headers()["location"]).toContain("kytelink.com");
  });

  test("a username path on a vanity host serves that profile", async ({ request }) => {
    const response = await request.get("http://localhost:3000/agent", {
      headers: { host: "kyte.bio" },
    });
    expect(response.status()).toBe(200);
    const body = await response.text();
    expect(body).toContain("data-kytelink-profile-view");
    expect(body).toContain("Building Kytelink in public. Follow along.");
  });

  test("a second vanity domain (kyte.lol) also serves profiles", async ({ request }) => {
    const response = await request.get("http://localhost:3000/agent", {
      headers: { host: "kyte.lol" },
    });
    expect(response.status()).toBe(200);
    expect(await response.text()).toContain("data-kytelink-profile-view");
  });
});
