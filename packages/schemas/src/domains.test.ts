import { describe, expect, it } from "vitest";
import {
  DOMAIN_STATUSES,
  dnsRecordSchema,
  domainStatusFromVerified,
  isVerifiedDomainStatus,
} from "./domains";

describe("domain status", () => {
  it("covers the four states", () => {
    expect(DOMAIN_STATUSES).toEqual(["PENDING", "VERIFYING", "ACTIVE", "ERROR"]);
  });

  it("reconciles with the Prisma verified boolean (verified <=> ACTIVE)", () => {
    expect(domainStatusFromVerified(true)).toBe("ACTIVE");
    expect(domainStatusFromVerified(false)).toBe("PENDING");
    expect(isVerifiedDomainStatus("ACTIVE")).toBe(true);
    expect(isVerifiedDomainStatus("VERIFYING")).toBe(false);
    expect(isVerifiedDomainStatus("PENDING")).toBe(false);
    expect(isVerifiedDomainStatus("ERROR")).toBe(false);
  });
});

describe("dnsRecordSchema", () => {
  it("parses A and CNAME records", () => {
    expect(dnsRecordSchema.parse({ type: "A", name: "@", value: "76.76.21.21" })).toEqual({
      type: "A",
      name: "@",
      value: "76.76.21.21",
    });
    expect(
      dnsRecordSchema.parse({ type: "CNAME", name: "www", value: "cname.vercel-dns.com" }).type,
    ).toBe("CNAME");
  });

  it("rejects unsupported record types", () => {
    expect(dnsRecordSchema.safeParse({ type: "TXT", name: "@", value: "x" }).success).toBe(false);
  });
});
