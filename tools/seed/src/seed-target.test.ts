import { describe, expect, it } from "vitest";
import { assertSeedTarget, isLocalDatabase } from "./index";

describe("assertSeedTarget", () => {
  it("allows the local dev and docker databases", () => {
    expect(isLocalDatabase("postgresql://kyte:kyte@localhost:5432/kyte")).toBe(true);
    expect(isLocalDatabase("postgresql://kyte:kyte@postgres:5432/kyte")).toBe(true);
    expect(() => assertSeedTarget({ DATABASE_URL: "postgresql://kyte:kyte@localhost:5432/kyte" })).not.toThrow();
  });

  it("refuses to write demo orgs and *.demo users into a remote database", () => {
    expect(() =>
      assertSeedTarget({ DATABASE_URL: "postgresql://u:p@dpg-abc.virginia-postgres.render.com/kytelink" }),
    ).toThrow(/refusing to seed sample data/);
  });

  it("names the production migration in the refusal so the operator has somewhere to go", () => {
    expect(() => assertSeedTarget({ DATABASE_URL: "postgresql://u:p@prod.example.com/kytelink" })).toThrow(
      /pnpm migrate:prod/,
    );
  });

  it("still refuses when DATABASE_URL is unset rather than silently seeding a default", () => {
    expect(() => assertSeedTarget({})).toThrow(/DATABASE_URL unset/);
  });

  it("allows an explicit opt-out for a throwaway remote dev database", () => {
    expect(() =>
      assertSeedTarget({ DATABASE_URL: "postgresql://u:p@dev.example.com/kytelink", SEED_ALLOW_REMOTE: "true" }),
    ).not.toThrow();
  });
});
