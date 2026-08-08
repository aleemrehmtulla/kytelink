import { describe, expect, it } from "vitest";
import { emptyProfileContent, profileContentSchema } from "@kytelink/schemas";
import { rewriteAssetEmojis, type AssetRecord } from "./backfill";
import { CLOUDFRONT_PFP, DEAD_IBB_LINK_IMAGE } from "./legacy-fixture-data";

const KYTE = "k1";

function nth(arr: unknown[], index: number): Record<string, unknown> {
  const value = arr[index];
  if (typeof value !== "object" || value === null) throw new Error(`expected a link object at ${index}`);
  return value as Record<string, unknown>;
}

function okRecord(url: string): AssetRecord {
  return {
    url,
    kyteId: KYTE,
    kind: "LINK_IMAGE",
    status: "ok",
    assetId: "asset_x",
    key: `u/${KYTE}/links/x.webp`,
    newUrl: "https://cdn.example.com/u/k1/links/x.webp",
  };
}

function failedRecord(url: string): AssetRecord {
  return { url, kyteId: KYTE, kind: "LINK_IMAGE", status: "failed", reason: "dead:404" };
}

describe("rewriteAssetEmojis", () => {
  it("rewrites a migrated legacy image to its new CDN URL", () => {
    const map: Record<string, AssetRecord> = { [`${KYTE}::${CLOUDFRONT_PFP}`]: okRecord(CLOUDFRONT_PFP) };
    const out = rewriteAssetEmojis(
      [{ title: "Live", link: "https://example.com/a", emoji: CLOUDFRONT_PFP, color: "transparent" }],
      KYTE,
      map,
    );
    expect(nth(out, 0).emoji).toBe("https://cdn.example.com/u/k1/links/x.webp");
  });

  it("DROPS the emoji key (not '') for a dead legacy image so the row stays schema-valid", () => {
    const map: Record<string, AssetRecord> = {
      [`${KYTE}::${DEAD_IBB_LINK_IMAGE}`]: failedRecord(DEAD_IBB_LINK_IMAGE),
    };
    const out = rewriteAssetEmojis(
      [{ title: "Dead", link: "https://example.com/c", emoji: DEAD_IBB_LINK_IMAGE, color: "transparent" }],
      KYTE,
      map,
    );
    const link = nth(out, 0);
    expect("emoji" in link).toBe(false);
    expect(link.emoji).toBeUndefined();
  });

  it("leaves non-legacy-asset emojis (Fa keys, unicode) untouched", () => {
    const out = rewriteAssetEmojis(
      [
        { title: "Icon", link: "https://example.com/a", emoji: "FaGithub" },
        { title: "Uni", link: "https://example.com/b", emoji: "🚀" },
      ],
      KYTE,
      {},
    );
    expect(nth(out, 0).emoji).toBe("FaGithub");
    expect(nth(out, 1).emoji).toBe("🚀");
  });

  it("produces content that validates under profileContentSchema after a dead-image drop", () => {
    const map: Record<string, AssetRecord> = {
      [`${KYTE}::${DEAD_IBB_LINK_IMAGE}`]: failedRecord(DEAD_IBB_LINK_IMAGE),
    };
    const links = rewriteAssetEmojis(
      [
        { title: "Dead", link: "https://example.com/c", emoji: DEAD_IBB_LINK_IMAGE, color: "transparent" },
        { title: "Good", link: "https://example.com/good", emoji: "FaGithub", color: "transparent" },
      ],
      KYTE,
      map,
    );
    const parsed = profileContentSchema.safeParse({ ...emptyProfileContent(), links });
    expect(parsed.success).toBe(true);
  });

  it("REGRESSION: writing emoji:'' would have failed the schema", () => {
    const bad = profileContentSchema.safeParse({
      ...emptyProfileContent(),
      links: [{ title: "Dead", link: "https://example.com/c", emoji: "", color: "transparent" }],
    });
    expect(bad.success).toBe(false);
  });
});
