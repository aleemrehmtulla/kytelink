import { describe, expect, it, vi } from "vitest";
import { createProxyDomainProvider, type DnsLookup } from "./proxy-provider";
import { isApex, recordTargets, verificationRecords } from "./records";
import { computeCapabilities } from "@kytelink/schemas";
import { isKnownProvider, normalizeProvider } from "./index";

const TARGETS = { aRecord: "203.0.113.10", cnameTarget: "edge.example.com" };

function fakeDns(over: Partial<Record<"cname" | "a", string[]>> = {}): DnsLookup {
  return {
    cname: vi.fn(async () => over.cname ?? []),
    a: vi.fn(async () => over.a ?? []),
  };
}

describe("records", () => {
  it("treats a bare domain as apex and a subdomain as not", () => {
    expect(isApex("example.com")).toBe(true);
    expect(isApex("links.example.com")).toBe(false);
  });

  it("offers an A record at the apex and a CNAME on www", () => {
    expect(verificationRecords("example.com", TARGETS)).toEqual([
      { type: "A", name: "example.com", value: "203.0.113.10" },
      { type: "CNAME", name: "www.example.com", value: "edge.example.com" },
    ]);
  });

  it("offers only a CNAME for a subdomain", () => {
    expect(verificationRecords("links.example.com", TARGETS)).toEqual([
      { type: "CNAME", name: "links.example.com", value: "edge.example.com" },
    ]);
  });

  // Regression: hardcoding Vercel's IP for a self-hoster points their users'
  // domains at somebody else's infrastructure.
  it("prefers env targets over the hosted Vercel defaults", () => {
    const targets = recordTargets({
      DOMAIN_PROVIDER: "vercel",
      CUSTOM_DOMAIN_A_RECORD: "198.51.100.7",
      CUSTOM_DOMAIN_CNAME_TARGET: "edge.selfhost.test",
    });
    expect(targets).toEqual({ aRecord: "198.51.100.7", cnameTarget: "edge.selfhost.test" });
  });

  it("falls back to Vercel's published targets only in vercel mode", () => {
    expect(recordTargets({ DOMAIN_PROVIDER: "vercel" })).toEqual({
      aRecord: "76.76.21.21",
      cnameTarget: "cname.vercel-dns.com",
    });
    expect(recordTargets({ DOMAIN_PROVIDER: "proxy" })).toEqual({ aRecord: "", cnameTarget: "" });
  });
});

describe("provider selection", () => {
  it("defaults to proxy and recognises exactly two providers", () => {
    expect(normalizeProvider(undefined)).toBe("proxy");
    expect(normalizeProvider("proxy")).toBe("proxy");
    expect(normalizeProvider("vercel")).toBe("vercel");
    expect(isKnownProvider("proxy")).toBe(true);
    expect(isKnownProvider("vercel")).toBe(true);
    expect(isKnownProvider(undefined)).toBe(true);
  });

  // A typo must not silently become proxy with no trace — that is how a hosted
  // deployment ends up never registering anything on Vercel.
  it("flags an unrecognised provider while still falling back safely", () => {
    expect(isKnownProvider("vercell")).toBe(false);
    expect(isKnownProvider("manual")).toBe(false);
    expect(normalizeProvider("vercell")).toBe("proxy");
  });

  // Regression: the capability check and the provider factory must agree on what
  // counts as "vercel". If one case-folds and the other does not, DOMAIN_PROVIDER=Vercel
  // builds the Vercel provider while the UI and the reaper treat domains as off.
  it("agrees with computeCapabilities on casing and padding", () => {
    for (const raw of ["vercel", "Vercel", "VERCEL", "  vercel  "]) {
      expect(normalizeProvider(raw)).toBe("vercel");
      expect(
        computeCapabilities({
          DOMAIN_PROVIDER: raw,
          VERCEL_TOKEN: "t",
          VERCEL_TEAM: "t",
          VERCEL_PROJECT: "p",
        }).domains,
      ).toBe(true);
    }
  });
});

describe("proxy provider", () => {
  it("connects when the CNAME points at the configured target", async () => {
    const provider = createProxyDomainProvider(TARGETS, fakeDns({ cname: ["edge.example.com."] }));
    expect(await provider.status("links.example.com")).toBe("CONNECTED");
  });

  it("connects when an apex resolves to the configured A record", async () => {
    const provider = createProxyDomainProvider(TARGETS, fakeDns({ a: ["203.0.113.10"] }));
    expect(await provider.status("example.com")).toBe("CONNECTED");
  });

  it("is pending when DNS points somewhere else", async () => {
    const provider = createProxyDomainProvider(
      TARGETS,
      fakeDns({ cname: ["someone-else.example.net"], a: ["198.51.100.1"] }),
    );
    expect(await provider.status("links.example.com")).toBe("PENDING");
  });

  it("is pending when the host does not resolve at all", async () => {
    expect(await createProxyDomainProvider(TARGETS, fakeDns()).status("nope.example.com")).toBe(
      "PENDING",
    );
  });

  // Without targets there is nothing to compare against; reporting CONNECTED
  // would let the reaper's `ask` endpoint approve certs for any host.
  it("errors rather than guessing when no targets are configured", async () => {
    const provider = createProxyDomainProvider(
      { aRecord: "", cnameTarget: "" },
      fakeDns({ a: ["203.0.113.10"] }),
    );
    expect(await provider.status("example.com")).toBe("ERROR");
  });
});
