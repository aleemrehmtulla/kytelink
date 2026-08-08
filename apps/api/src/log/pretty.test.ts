import { describe, expect, it } from "vitest";
import { formatRecord, makePaint, SILENCED } from "./pretty";
import { describeTrpcError } from "./request-log";

const plain = makePaint(false);

function render(record: Record<string, unknown>): string {
  return formatRecord({ level: 30, time: Date.parse("2026-07-31T14:02:29Z"), ...record } as never, plain) ?? "";
}

describe("dev log lines", () => {
  it("leads with the clock and the subsystem, and drops pid/hostname/reqId", () => {
    const line = render({ tag: "auth", msg: "login code 000000 for a@b.dev", pid: 123, hostname: "mac", reqId: "req-4" });
    expect(line).toContain("auth");
    expect(line).toContain("login code 000000 for a@b.dev");
    expect(line).not.toContain("123");
    expect(line).not.toContain("mac");
    expect(line).not.toContain("req-4");
  });

  it("folds leftover fields into a key=value tail instead of a JSON dump", () => {
    const line = render({ tag: "sitemap", msg: "sitemap generated", urlCount: 6309, storedInBucket: true });
    expect(line).toContain("sitemap generated  urlCount=6309 storedInBucket=true");
  });

  it("aligns a request into method / status / duration / target columns", () => {
    const line = render({
      tag: "trpc",
      kind: "request",
      method: "POST",
      status: 400,
      ms: 5,
      target: "kyte.create",
      actor: "agent@kytelink.dev",
      note: "BAD_REQUEST  username: expected string",
    });
    expect(line).toContain("POST 400     5ms");
    expect(line).toContain("kyte.create");
    expect(line).toContain("agent@kytelink.dev");
    expect(line).toContain("BAD_REQUEST  username: expected string");
  });

  it("names an error on its own line, with a stack only when it is a real fault", () => {
    const err = { type: "TypeError", message: "x is not a function", stack: "TypeError: x\n    at foo (/a.ts:1:2)" };
    expect(render({ level: 40, tag: "domains", msg: "attach failed", err })).not.toContain("at foo");
    const fault = render({ level: 50, tag: "domains", msg: "attach failed", err });
    expect(fault).toContain("↳ TypeError: x is not a function");
    expect(fault).toContain("at foo (/a.ts:1:2)");
  });

  it("indents a multi-line message under the tag column", () => {
    const [first, second] = render({ tag: "boot", msg: "capabilities off: 1 of 7.\n  analytics  set CLICKHOUSE_URL" }).split("\n");
    expect(first).toContain("capabilities off: 1 of 7.");
    expect(second?.startsWith("                   ")).toBe(true);
  });

  it("swallows the sentinel that replaces fastify's own listening line", () => {
    expect(formatRecord({ level: 30, time: Date.now(), msg: SILENCED } as never, plain)).toBeNull();
  });
});

describe("tRPC failure reasons", () => {
  it("reports the first zod issue by field instead of the serialized issue array", () => {
    const reason = describeTrpcError({
      code: "BAD_REQUEST",
      message: "[{...}]",
      cause: { issues: [{ path: ["username"], message: "expected string" }, { path: ["title"], message: "required" }] },
    });
    expect(reason).toBe("BAD_REQUEST  username: expected string (+1 more)");
  });

  it("falls back to the error message for non-validation failures", () => {
    expect(describeTrpcError({ code: "UNAUTHORIZED", message: "Sign in required." })).toBe(
      "UNAUTHORIZED  Sign in required.",
    );
  });
});
