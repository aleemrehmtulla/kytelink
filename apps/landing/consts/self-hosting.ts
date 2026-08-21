import { GITHUB_REPO, GITHUB_REPO_URL } from "./site";

export type TerminalLine = { text: string; kind: "cmd" | "comment" | "output" };

export const QUICK_START: TerminalLine[] = [
  { text: `git clone ${GITHUB_REPO_URL}.git && cd ${GITHUB_REPO}`, kind: "cmd" },
  { text: "pnpm install", kind: "cmd" },
  { text: "pnpm run setup", kind: "cmd" },
  {
    text: "# asks what you want (Postgres is the only must), then writes",
    kind: "comment",
  },
  {
    text: "# .env with fresh secrets, starts Docker, migrates, and seeds",
    kind: "comment",
  },
  { text: "pnpm dev", kind: "cmd" },
  { text: "→ web:3000 · landing:3001 · admin:3002 · api:3003 🪁", kind: "output" },
];

export const QUICK_START_STEPS = QUICK_START.filter((line) => line.kind === "cmd").map(
  (line) => line.text,
);
