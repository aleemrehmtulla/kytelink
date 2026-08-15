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
 */
export async function runWithConcurrency<T>(
  items: readonly T[],
  limit: number,
  task: (item: T, index: number) => Promise<void>,
): Promise<void> {
  const workers = Math.max(1, Math.min(limit, items.length));
  let cursor = 0;

  async function drain(): Promise<void> {
    for (;;) {
      const index = cursor;
      cursor += 1;
      const item = items[index];
      if (index >= items.length || item === undefined) return;
      await task(item, index);
    }
  }

  await Promise.all(Array.from({ length: workers }, () => drain()));
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
