import { cpus } from "node:os";

/**
 * sharp is CPU-bound; unbounded parallel encodes stall the event loop and
 * spike memory (08-media.md). This bounds concurrent image jobs in-process
 * to ~(cores - 1) regardless of how many finalize calls land at once.
 */
class BoundedQueue {
  private active = 0;
  private readonly waiting: (() => void)[] = [];

  constructor(private readonly concurrency: number) {}

  async run<T>(task: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await task();
    } finally {
      this.release();
    }
  }

  private acquire(): Promise<void> {
    if (this.active < this.concurrency) {
      this.active += 1;
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      this.waiting.push(() => {
        this.active += 1;
        resolve();
      });
    });
  }

  private release(): void {
    this.active -= 1;
    const next = this.waiting.shift();
    if (next) next();
  }
}

const concurrency = Math.max(1, cpus().length - 1);

export const imageProcessQueue = new BoundedQueue(concurrency);
export const imageProcessConcurrency = concurrency;
