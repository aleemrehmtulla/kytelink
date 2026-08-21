import { reapStaleStack } from "./run-apps.mjs";

// Tears down both stacks — the human `pnpm dev` one and the agent-mode one —
// whether their orchestrators are alive, dead, or long gone. Safe to run any
// time: it only touches processes recorded in a stack lockfile whose command
// lines still look like Kytelink dev tasks.
const dev = await reapStaleStack("dev", { takeover: true });
const agents = await reapStaleStack("agents", { takeover: true });

const total = dev.reaped + agents.reaped;
process.stdout.write(
  total === 0 ? "No Kytelink dev stacks running — nothing to stop.\n" : `Stopped ${total} process(es).\n`,
);
