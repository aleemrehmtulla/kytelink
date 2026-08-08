import { describe, expect, it } from "vitest";
import {
  LIMIT_DEFAULTS,
  LIMIT_OVERRIDE_CEILING,
  TOTAL_ORGS_PER_USER,
  isValidCountOverride,
  resolveLimit,
} from "./limits";

describe("limits resolver", () => {
  it("uses the default when no override is set", () => {
    expect(resolveLimit(LIMIT_DEFAULTS.kytesPerOrg)).toBe(10);
    expect(resolveLimit(LIMIT_DEFAULTS.kytesPerOrg, null)).toBe(10);
  });

  it("uses the override when present", () => {
    expect(resolveLimit(LIMIT_DEFAULTS.kytesPerOrg, 42)).toBe(42);
  });

  it("treats 0 as a real override, not a fallback", () => {
    expect(resolveLimit(LIMIT_DEFAULTS.kytesPerOrg, 0)).toBe(0);
  });

  it("exposes the correct defaults", () => {
    expect(LIMIT_DEFAULTS.peoplePerOrg).toBe(10);
    expect(LIMIT_DEFAULTS.orgsOwnedPerUser).toBe(3);
    expect(LIMIT_DEFAULTS.orgsJoinedPerUser).toBe(7);
    expect(LIMIT_DEFAULTS.schedulesPerKyte).toBe(3);
    expect(LIMIT_DEFAULTS.storageBytesPerOrg).toBe(250 * 1024 * 1024);
    expect(LIMIT_DEFAULTS.uploadMaxBytes).toBe(10 * 1024 * 1024);
    expect(TOTAL_ORGS_PER_USER).toBe(10);
  });

  it("validates count overrides against the ceiling", () => {
    expect(isValidCountOverride(0)).toBe(true);
    expect(isValidCountOverride(LIMIT_OVERRIDE_CEILING)).toBe(true);
    expect(isValidCountOverride(LIMIT_OVERRIDE_CEILING + 1)).toBe(false);
    expect(isValidCountOverride(-1)).toBe(false);
    expect(isValidCountOverride(1.5)).toBe(false);
  });
});
