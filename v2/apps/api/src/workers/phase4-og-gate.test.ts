import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ProfileContent } from "@kytelink/schemas";
import type { KyteRow } from "../store/store";
import { loadConfig, setConfigForTest } from "../config";

vi.mock("../assets", () => ({
  enqueueOgImageJob: vi.fn(async () => undefined),
  enqueueQuarantineJob: vi.fn(async () => undefined),
}));

import { enqueueOgImageJob } from "../assets";
import { afterPublish } from "../publish-hooks";

const mockedEnqueueOg = vi.mocked(enqueueOgImageJob);

function fakeKyte(username: string): KyteRow {
  return {
    id: `og-${username}`,
    orgId: "og-org",
    username,
    draft: { displayName: "Og Owner", theme: "default" } as unknown as ProfileContent,
    published: null,
    publishSeq: 0,
    publishedAt: null,
    moderationStatus: "APPROVED",
    updatedAt: new Date(),
    createdAt: new Date(),
  };
}

beforeEach(() => {
  mockedEnqueueOg.mockClear();
});

describe("og-image enqueue is gated on the uploads capability (SH1)", () => {
  it("skips the og-image job when uploads are off", async () => {
    setConfigForTest(loadConfig({ ...process.env, AWS_S3_BUCKET: "" }));
    await afterPublish(fakeKyte("ogoff"), 1);
    expect(mockedEnqueueOg).not.toHaveBeenCalled();
  });

  it("enqueues the og-image job when uploads are on", async () => {
    setConfigForTest(loadConfig({ ...process.env }));
    await afterPublish(fakeKyte("ogon"), 1);
    expect(mockedEnqueueOg).toHaveBeenCalledTimes(1);
  });
});
