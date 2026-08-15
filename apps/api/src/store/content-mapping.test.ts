import { describe, expect, it } from "vitest";
import { emptyProfileContent } from "@kytelink/schemas";
import { columnsToContent, contentToColumns } from "./content-mapping";

function row(over: Partial<ReturnType<typeof contentToColumns>> = {}) {
  return { ...contentToColumns(emptyProfileContent()), ...over };
}

describe("content-mapping carries the content booleans both directions", () => {
  it("reads hideWatermark off a row", () => {
    expect(columnsToContent(row()).hideWatermark).toBe(false);
    expect(columnsToContent(row({ hideWatermark: true })).hideWatermark).toBe(true);
  });

  it("writes hideWatermark back to a column", () => {
    expect(contentToColumns(emptyProfileContent()).hideWatermark).toBe(false);
    expect(
      contentToColumns({ ...emptyProfileContent(), hideWatermark: true }).hideWatermark,
    ).toBe(true);
  });

  it("round-trips a row through content and back unchanged", () => {
    const original = row({ hideWatermark: true, shouldRedirect: true, displayName: "Agent" });
    expect(contentToColumns(columnsToContent(original))).toEqual(original);
  });
});
