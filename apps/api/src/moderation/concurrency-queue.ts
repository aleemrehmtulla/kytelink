export interface ConcurrencyQueue {
  run<T>(task: () => Promise<T>): Promise<T>;
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
