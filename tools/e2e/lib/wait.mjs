import { spawnSync } from "node:child_process";
import { log, repoRoot, sleep } from "./proc.mjs";

export async function waitForHttp(url, { timeoutMs = 120000, okStatuses = [200], label } = {}) {
  const deadline = Date.now() + timeoutMs;
  const name = label ?? url;
  let lastErr = "no response";
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { redirect: "manual" });
      if (okStatuses.includes(res.status)) {
        log(`ready: ${name} (${res.status})`, "green");
        return true;
      }
      lastErr = `status ${res.status}`;
    } catch (err) {
      lastErr = err instanceof Error ? err.message : String(err);
    }
    await sleep(1000);
  }
  throw new Error(`timed out waiting for ${name} after ${timeoutMs}ms (last: ${lastErr})`);
}

/**
 * Wait until all docker compose services report healthy (or running, for those
 * without a healthcheck). One-shot bootstrap containers that have exited 0 pass.
 */
export async function waitForDockerHealthy({ timeoutMs = 180000 } = {}) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const res = spawnSync("docker", ["compose", "ps", "--format", "json"], {
      cwd: repoRoot,
      encoding: "utf8",
    });
    if (res.status === 0 && res.stdout.trim()) {
      const lines = res.stdout.trim().split("\n").filter(Boolean);
      const services = lines.map((l) => JSON.parse(l));
      const pending = services.filter((s) => {
        const health = s.Health ?? "";
        const state = s.State ?? "";
        if (health === "healthy") return false;
        if (health === "" && (state === "running" || state === "exited")) return false;
        return true;
      });
      if (pending.length === 0) {
        log(`ready: docker (${services.length} services)`, "green");
        return true;
      }
      log(`waiting on: ${pending.map((s) => `${s.Service}=${s.Health || s.State}`).join(", ")}`, "dim");
    }
    await sleep(2000);
  }
  throw new Error(`timed out waiting for docker services healthy after ${timeoutMs}ms`);
}
