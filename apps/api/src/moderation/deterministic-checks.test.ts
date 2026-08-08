import { describe, expect, it } from "vitest";
import { runDeterministicChecks } from "./deterministic-checks";
import { buildSnapshot } from "./fixtures";

describe("runDeterministicChecks", () => {
  it("returns null for an ordinary profile", () => {
    expect(runDeterministicChecks(buildSnapshot(), 1)).toBeNull();
  });

  it("flags a shortener domain in the redirect url", () => {
    const result = runDeterministicChecks(
      buildSnapshot({ redirectUrl: "https://bit.ly/abc123" }),
      1,
    );
    expect(result?.verdict).toBe("SUSPEND");
    expect(result?.signals.sus_redirect?.pattern).toContain("shortener");
  });

  it("flags a sketchy TLD link", () => {
    const result = runDeterministicChecks(
      buildSnapshot({ links: [{ title: "Deal", url: "https://freegift.top/claim" }] }),
      1,
    );
    expect(result?.verdict).toBe("SUSPEND");
    expect(result?.signals.sus_link?.[0]?.pattern).toContain("sketchy_tld");
  });

  it("flags a known blocklisted url", () => {
    const result = runDeterministicChecks(
      buildSnapshot({ links: [{ title: "Track", url: "https://grabify.link/xyz" }] }),
      1,
    );
    expect(result?.verdict).toBe("SUSPEND");
    expect(result?.signals.sus_link?.[0]?.pattern).toContain("blocklist");
  });

  it("does not suspend legal adult-adjacent-but-ordinary content", () => {
    const result = runDeterministicChecks(
      buildSnapshot({ displayName: "Luxe Lingerie Co", description: "Shop our new collection" }),
      1,
    );
    expect(result).toBeNull();
  });

  it("flags account-email mismatch alongside a brand-name hit", () => {
    const result = runDeterministicChecks(
      buildSnapshot({ displayName: "PayPal Support", ownerEmailDomain: "gmail.com" }),
      1,
    );
    expect(result?.signals.sus_email?.domain).toBe("gmail.com");
  });

  it("embeds the publishSeq in signals for the ordering guard", () => {
    const result = runDeterministicChecks(buildSnapshot({ displayName: "Amazon Support" }), 42);
    expect(result?.signals.publishSeq).toBe(42);
  });
});
