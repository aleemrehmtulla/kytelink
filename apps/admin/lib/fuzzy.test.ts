import { describe, expect, it } from "vitest";
import { fuzzyFilter, fuzzyScore } from "./fuzzy";

describe("fuzzyScore", () => {
  it("returns -1 when the query is not a subsequence", () => {
    expect(fuzzyScore("jane", "zzz")).toBe(-1);
    expect(fuzzyScore("jane", "janet")).toBe(-1);
    expect(fuzzyScore("", "a")).toBe(-1);
  });

  it("returns 0 for an empty query", () => {
    expect(fuzzyScore("jane.doe@example.com", "")).toBe(0);
  });

  it("ranks a prefix match above a mid-word match", () => {
    expect(fuzzyScore("jane", "jan")).toBeGreaterThan(fuzzyScore("dejan", "jan"));
  });

  it("ranks a word-boundary match above a mid-word match", () => {
    expect(fuzzyScore("acme corp", "corp")).toBeGreaterThan(
      fuzzyScore("scorpion", "corp"),
    );
  });

  it("ranks a camelCase boundary above a mid-word match", () => {
    expect(fuzzyScore("orgKytes", "kytes")).toBeGreaterThan(
      fuzzyScore("worklytes", "kytes"),
    );
  });

  it("matches non-contiguous subsequences", () => {
    expect(fuzzyScore("jane.doe@x.com", "jdoe")).toBeGreaterThan(0);
    expect(fuzzyScore("Storage / orphans", "sorph")).toBeGreaterThan(0);
  });

  it("prefers tighter matches over sparser ones", () => {
    expect(fuzzyScore("audit log", "aud")).toBeGreaterThan(
      fuzzyScore("a very useful dashboard", "aud"),
    );
  });

  it("is case-insensitive but rewards exact case", () => {
    expect(fuzzyScore("Alerts", "alerts")).toBeGreaterThan(0);
    expect(fuzzyScore("alerts", "alerts")).toBeGreaterThan(
      fuzzyScore("Alerts", "alerts"),
    );
  });
});

interface Row {
  name: string;
  email: string;
}

const rows: Row[] = [
  { name: "Dejan Petrov", email: "dejan@example.com" },
  { name: "Jane Doe", email: "jane.doe@example.com" },
  { name: "Mallory Quinn", email: "mallory@example.com" },
];

const keys = (row: Row) => [row.name, row.email];

describe("fuzzyFilter", () => {
  it("returns every item for an empty query", () => {
    expect(fuzzyFilter(rows, "", keys)).toEqual(rows);
    expect(fuzzyFilter(rows, "   ", keys)).toEqual(rows);
  });

  it("drops non-matching items", () => {
    expect(fuzzyFilter(rows, "zzz", keys)).toEqual([]);
  });

  it("sorts by best key score, prefix first", () => {
    const result = fuzzyFilter(rows, "jan", keys);
    expect(result.map((row) => row.name)).toEqual(["Jane Doe", "Dejan Petrov"]);
  });

  it("matches on a secondary key", () => {
    expect(fuzzyFilter(rows, "jdoe", keys).map((row) => row.name)).toEqual(["Jane Doe"]);
  });

  it("is stable for ties", () => {
    const ties: Row[] = [
      { name: "same", email: "a@x.com" },
      { name: "same", email: "b@x.com" },
      { name: "same", email: "c@x.com" },
    ];
    expect(fuzzyFilter(ties, "same", keys).map((row) => row.email)).toEqual([
      "a@x.com",
      "b@x.com",
      "c@x.com",
    ]);
  });
});
