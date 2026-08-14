import { describe, expect, it } from "vitest";
import { emptyProfileContent } from "@kytelink/schemas";
import { columnsToContent, contentToColumns } from "./content-mapping";

function row(over: Partial<ReturnType<typeof contentToColumns>> = {}) {
  return { ...contentToColumns(emptyProfileContent()), ...over };
}

describe("content-mapping carries the content booleans both directions", () => {
  it("reads hideFromDiscover off a row", () => {
    expect(columnsToContent(row()).hideFromDiscover).toBe(false);
    expect(columnsToContent(row({ hideFromDiscover: true })).hideFromDiscover).toBe(true);
  });

  it("writes hideFromDiscover back to a column", () => {
    expect(contentToColumns(emptyProfileContent()).hideFromDiscover).toBe(false);
    expect(
      contentToColumns({ ...emptyProfileContent(), hideFromDiscover: true }).hideFromDiscover,
    ).toBe(true);
  });

  it("round-trips a row through content and back unchanged", () => {
    const original = row({ hideFromDiscover: true, hideWatermark: true, displayName: "Agent" });
    expect(contentToColumns(columnsToContent(original))).toEqual(original);
  });
});
