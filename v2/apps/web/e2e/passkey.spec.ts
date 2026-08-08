import { expect, test, type CDPSession } from "@playwright/test";

const AGENT_EMAIL = "agent@kytelink.dev";

async function addVirtualAuthenticator(client: CDPSession): Promise<void> {
  await client.send("WebAuthn.enable");
  await client.send("WebAuthn.addVirtualAuthenticator", {
    options: {
      protocol: "ctap2",
      transport: "internal",
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      automaticPresenceSimulation: true,
    },
  });
}

test("passkey register + login round-trip against the real stack", async ({ page }) => {
  const client = await page.context().newCDPSession(page);
  await addVirtualAuthenticator(client);

  // Auto-name the passkey when the account page prompts.
  page.on("dialog", (dialog) => void dialog.accept("E2E Virtual Key"));

  await page.goto("/login");
  await page.getByRole("button", { name: /Agent quick sign-in/ }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 20000 });

  // Passkeys left in the DB by earlier runs don't live on this run's fresh virtual
  // authenticator, so clear them before registering or the login step picks a dead one.
  await page.goto("/account");
  await expect(page.getByRole("heading", { name: "Passkeys" })).toBeVisible();
  const removeButtons = page.getByRole("button", { name: "Remove" });
  for (let remaining = await removeButtons.count(); remaining > 0; remaining -= 1) {
    await removeButtons.first().click();
    await expect(removeButtons).toHaveCount(remaining - 1, { timeout: 10000 });
  }
  await page.getByRole("button", { name: "Add passkey" }).click();
  await expect(page.getByText("E2E Virtual Key")).toBeVisible({ timeout: 20000 });

  await page.goto("/edit");
  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("button", { name: "Log out" }).click();
  await page.waitForURL((url) => url.pathname.startsWith("/login"), { timeout: 20000 });

  // Both the explicit button and conditional-UI autofill call the same wired
  // completePasskeySignIn → signIn.passkey ceremony; with the virtual authenticator
  // the autofill path may resolve first, so accept whichever mints the session.
  const signedIn = page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 25000 });
  try {
    await page.getByRole("button", { name: /Sign in with a passkey/ }).click({ timeout: 4000 });
  } catch {
    // conditional-UI autofill already navigated / detached the button — fine.
  }
  await signedIn;

  await page.goto("/account");
  await expect(page.getByText(AGENT_EMAIL)).toBeVisible({ timeout: 20000 });
});
