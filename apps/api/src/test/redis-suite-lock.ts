import { getRedis } from "../redis";

const TTL_SEC = 60;
const POLL_MS = 50;

/**
 * Vitest runs test files in parallel workers, but suites that share real Redis
 * state (the sweep progress blob and its bull queue) delete and rewrite the
 * same keys — run together they race, alternating which one fails. Files that
 * share such state take this lock in beforeAll so they run one at a time
 * without serializing the rest of the suite.
 */
export async function acquireSuiteLock(name: string): Promise<() => Promise<void>> {
  const redis = getRedis();
  const key = `test:suite-lock:${name}`;
  const token = `${process.pid}-${Math.random().toString(36).slice(2)}`;
  for (;;) {
    const claimed = await redis.set(key, token, "EX", TTL_SEC, "NX");
    if (claimed) break;
    await new Promise((resolveWait) => setTimeout(resolveWait, POLL_MS));
  }
  return async () => {
    if ((await redis.get(key)) === token) await redis.del(key);
  };
}
