import { describe, expect, it } from "vitest";
import { getDb } from "./index";

process.env.DATABASE_URL ??= "postgresql://kyte:kyte@localhost:5432/kyte";

describe("packages/db smoke", () => {
  it("returns the same client instance across calls", () => {
    expect(getDb()).toBe(getDb());
  });
});
