import { mkdir, readFile, appendFile, writeFile, rename, rm } from "node:fs/promises";
import { join } from "node:path";

export class Checkpoint {
  constructor(private readonly dir: string) {}

  async ensure(): Promise<void> {
    await mkdir(this.dir, { recursive: true });
  }

  private path(name: string): string {
    return join(this.dir, name);
  }

  async loadSet(name: string): Promise<Set<string>> {
    try {
      const raw = await readFile(this.path(`${name}.log`), "utf8");
      return new Set(raw.split("\n").map((line) => line.trim()).filter((line) => line.length > 0));
    } catch {
      return new Set();
    }
  }

  async mark(name: string, id: string): Promise<void> {
    await appendFile(this.path(`${name}.log`), `${id}\n`, "utf8");
  }

  async readJson<T>(name: string, fallback: T): Promise<T> {
    try {
      const raw = await readFile(this.path(`${name}.json`), "utf8");
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }

  async writeJson(name: string, value: unknown): Promise<void> {
    const target = this.path(`${name}.json`);
    const tmp = `${target}.tmp`;
    await writeFile(tmp, JSON.stringify(value, null, 2), "utf8");
    await rename(tmp, target);
  }

  async reset(): Promise<void> {
    await rm(this.dir, { recursive: true, force: true });
  }
}
