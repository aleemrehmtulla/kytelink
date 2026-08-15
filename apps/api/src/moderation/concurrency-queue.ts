export interface ConcurrencyQueue {
  run<T>(task: () => Promise<T>): Promise<T>;
}

/**
 * Worker-pool form for a known list: `limit` workers pull from one shared
 * cursor. The queue above is the right shape for tasks that arrive one at a
 * time, but feeding it thousands of items up front would materialise a promise
 * per item and shift() a pending array that long on every completion. Reading
 * and bumping `cursor` never awaits in between, so no two workers can claim the
 * same index. `task` must absorb its own failures — one rejection abandons the
 * pool with the other workers still in flight.
 *
 * `shouldStop` is checked before each claim and is deliberately synchronous:
 * it sits in the hot path, so the caller caches whatever it really wants to
 * know. Stopping only halts *claiming* — work already in flight is awaited, so
 * a cancelled run still leaves every started review finished and recorded.
 */
export interface RunWithConcurrencyOptions {
  shouldStop?: () => boolean;
}

export interface RunWithConcurrencyResult {
  claimed: number;
  stopped: boolean;
}

export async function runWithConcurrency<T>(
  items: readonly T[],
  limit: number,
  task: (item: T, index: number) => Promise<void>,
  options: RunWithConcurrencyOptions = {},
): Promise<RunWithConcurrencyResult> {
  const workers = Math.max(1, Math.min(limit, items.length));
  let cursor = 0;
  let claimed = 0;
  let stopped = false;

  async function drain(): Promise<void> {
    for (;;) {
      if (options.shouldStop?.()) {
        stopped = true;
        return;
      }
      const index = cursor;
      cursor += 1;
      const item = items[index];
      if (index >= items.length || item === undefined) return;
      claimed += 1;
      await task(item, index);
    }
  }

  await Promise.all(Array.from({ length: workers }, () => drain()));
  return { claimed, stopped };
}

export function createConcurrencyQueue(limit: number): ConcurrencyQueue {
  let active = 0;
  const pending: Array<() => void> = [];

  function next(): void {
    active -= 1;
    const resume = pending.shift();
    if (resume) resume();
  }

  async function acquire(): Promise<void> {
    if (active < limit) {
      active += 1;
      return;
    }
    await new Promise<void>((resolve) => pending.push(resolve));
    active += 1;
  }

  return {
    async run<T>(task: () => Promise<T>): Promise<T> {
      await acquire();
      try {
        return await task();
      } finally {
        next();
      }
    },
  };
}
