import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  assertPortsFree,
  installShutdownHandlers,
  portInUse,
  reapStaleStack,
  root,
  runFilter,
  writeAppServerEnv,
  writeStackLock,
} from "./run-apps.mjs";
import { ensureInfra, parseEnvFile, runMigrations, runSeed } from "./setup.mjs";

const PORTS = { web: 4000, landing: 4001, admin: 4002, api: 4003, cdn: 5002 };

await reapStaleStack("agents");

// cdn is shared with a human's `pnpm dev` stack, so an existing listener on
// 5002 is reused rather than treated as a conflict. The agent-only ports must
// be free — a taken api port would otherwise leave `tsx watch` idling behind
// an EADDRINUSE crash, which is exactly the leak the reaping exists to end.
const { cdn: cdnPort, ...exclusivePorts } = PORTS;
await assertPortsFree(exclusivePorts);
const cdnAlreadyUp = await portInUse(cdnPort);

if (!existsSync(join(root, ".env"))) {
  process.stdout.write("No .env found — running one-shot setup (full local stack)...\n");
  const result = spawnSync("node", [join(root, "scripts", "setup.mjs"), "--all", "--no-seed"], {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
  for (const [key, value] of Object.entries(parseEnvFile() ?? {})) {
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

if (!(await ensureInfra(process.env, { quiet: true }))) process.exit(1);
runMigrations(process.env);
runSeed(process.env, { agentMode: true });

process.stdout.write(
  [
    "",
    "Kytelink agent mode (AGENT_MODE=true, port+1000)",
    "=================================================",
    "  app       port   url",
    `  web       ${PORTS.web}   http://localhost:${PORTS.web}`,
    `  landing   ${PORTS.landing}   http://localhost:${PORTS.landing}`,
    `  admin     ${PORTS.admin}   http://localhost:${PORTS.admin}`,
    `  api       ${PORTS.api}   http://localhost:${PORTS.api}`,
    `  cdn       ${PORTS.cdn}   http://localhost:${PORTS.cdn} (shared with normal dev)`,
    "",
    "Agent logins (OTP is always 000000 in agent mode):",
    "  agent@kytelink.dev        personal org, one published @agent kyte, one draft, MANAGER in org_agency_demo",
    "  agent-admin@kytelink.dev  platform ADMIN",
    "",
    `  Fast path: POST http://localhost:${PORTS.api}/auth/dev-login {"email":"agent@kytelink.dev"}`,
    "",
    "Same Postgres/Redis/ClickHouse/MinIO as normal `pnpm dev` — no separate data store.",
    "",
  ].join("\n"),
);

const agentEnv = {
  AGENT_MODE: "true",
  WEB_BASE_URL: `http://localhost:${PORTS.web}`,
  API_BASE_URL: `http://localhost:${PORTS.api}`,
  LANDING_ZONE_URL: `http://localhost:${PORTS.landing}`,
  ADMIN_BASE_URL: `http://localhost:${PORTS.admin}`,
  NEXT_PUBLIC_API_URL: `http://localhost:${PORTS.api}`,
  NEXT_PUBLIC_WEB_URL: `http://localhost:${PORTS.web}`,
  NEXT_PUBLIC_LANDING_URL: `http://localhost:${PORTS.landing}`,
};

writeAppServerEnv(agentEnv);
installShutdownHandlers();

if (cdnAlreadyUp) {
  process.stdout.write(`cdn already listening on :${cdnPort} — reusing it.\n`);
} else {
  runFilter("cdn", "@kytelink/cdn", ["run", "dev"]);
}
runFilter("web", "@kytelink/web", ["exec", "next", "dev", "-p", String(PORTS.web)], agentEnv);
runFilter("landing", "@kytelink/landing", ["exec", "next", "dev", "-p", String(PORTS.landing)], agentEnv);
runFilter("admin", "@kytelink/admin", ["exec", "next", "dev", "-p", String(PORTS.admin)], agentEnv);
runFilter("api", "@kytelink/api", ["run", "dev"], { ...agentEnv, PORT: String(PORTS.api) });

writeStackLock("agents");
