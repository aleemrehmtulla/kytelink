import { describe, expect, it, vi } from "vitest";
import type Redis from "ioredis";
import { bufferKey, drainBufferedRows, insertOrBuffer, type BufferDeps } from "./clickhouse-buffer";

function fakeRedis() {
  const lists = new Map<string, string[]>();
  return {
    lists,
    rpush: vi.fn(async (key: string, ...values: string[]) => {
      const list = lists.get(key) ?? [];
      list.push(...values);
      lists.set(key, list);
      return list.length;
    }),
    // Mirrors real Redis LPUSH semantics: each argument is pushed to the head
    // one at a time (left to right), so the final head order is the reverse
    // of the argument order.
    lpush: vi.fn(async (key: string, ...values: string[]) => {
      const list = [...values].reverse().concat(lists.get(key) ?? []);
      lists.set(key, list);
      return list.length;
    }),
    lpop: vi.fn(async (key: string, count: number) => {
      const list = lists.get(key) ?? [];
      const popped = list.splice(0, count);
      return popped.length > 0 ? popped : null;
    }),
    llen: vi.fn(async (key: string) => (lists.get(key) ?? []).length),
  };
}

describe("insertOrBuffer", () => {
  it("does nothing when the insert succeeds", async () => {
    const redis = fakeRedis();
    const insert = vi.fn().mockResolvedValue(undefined);
    const deps: BufferDeps = { redis: redis as unknown as Redis };

    await insertOrBuffer(deps, "page_hits", [{ a: 1 }], insert);

    expect(insert).toHaveBeenCalledWith([{ a: 1 }]);
    expect(redis.lists.get(bufferKey("page_hits"))).toBeUndefined();
  });

  it("buffers the rows to redis when the insert throws", async () => {
    const redis = fakeRedis();
    const insert = vi.fn().mockRejectedValue(new Error("clickhouse down"));
    const deps: BufferDeps = { redis: redis as unknown as Redis, log: { warn: vi.fn(), error: vi.fn() } };

    await insertOrBuffer(deps, "page_hits", [{ a: 1 }, { a: 2 }], insert);

    expect(redis.lists.get(bufferKey("page_hits"))).toEqual([
      JSON.stringify({ a: 1 }),
      JSON.stringify({ a: 2 }),
    ]);
  });
});

describe("drainBufferedRows", () => {
  it("pops buffered rows and inserts them, removing them from the list", async () => {
    const redis = fakeRedis();
    redis.lists.set(bufferKey("page_hits"), [JSON.stringify({ a: 1 }), JSON.stringify({ a: 2 })]);
    const insert = vi.fn().mockResolvedValue(undefined);
    const deps: BufferDeps = { redis: redis as unknown as Redis };

    const result = await drainBufferedRows(deps, "page_hits", insert);

    expect(insert).toHaveBeenCalledWith([{ a: 1 }, { a: 2 }]);
    expect(result).toEqual({ drained: 2, remaining: 0 });
    expect(redis.lists.get(bufferKey("page_hits"))).toEqual([]);
  });

  it("re-buffers rows in original order when clickhouse is still down", async () => {
    const redis = fakeRedis();
    redis.lists.set(bufferKey("page_hits"), [JSON.stringify({ a: 1 }), JSON.stringify({ a: 2 })]);
    const insert = vi.fn().mockRejectedValue(new Error("still down"));
    const deps: BufferDeps = { redis: redis as unknown as Redis, log: { warn: vi.fn(), error: vi.fn() } };

    const result = await drainBufferedRows(deps, "page_hits", insert);

    expect(result).toEqual({ drained: 0, remaining: 2 });
    expect(redis.lists.get(bufferKey("page_hits"))).toEqual([
      JSON.stringify({ a: 1 }),
      JSON.stringify({ a: 2 }),
    ]);
  });

  it("is a no-op when the buffer is empty", async () => {
    const redis = fakeRedis();
    const insert = vi.fn();
    const deps: BufferDeps = { redis: redis as unknown as Redis };

    const result = await drainBufferedRows(deps, "page_hits", insert);

    expect(insert).not.toHaveBeenCalled();
    expect(result).toEqual({ drained: 0, remaining: 0 });
  });
});
