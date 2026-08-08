import type { ModerationKyteSnapshot } from "./types";

export function buildSnapshot(overrides: Partial<ModerationKyteSnapshot> = {}): ModerationKyteSnapshot {
  return {
    kyteId: "k_test",
    orgId: "org_test",
    username: "testuser",
    displayName: "Test User",
    description: "An ordinary profile.",
    links: [{ title: "My site", url: "https://example.com" }],
    icons: [],
    avatarAssetId: null,
    avatarUrl: null,
    redirectUrl: null,
    ownerEmailDomain: "example.com",
    publishSeq: 1,
    moderationStatus: "APPROVED",
    contentHash: null,
    ...overrides,
  };
}
