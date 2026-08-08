import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { isAbsolute, join } from "node:path";

const V2_ROOT = fileURLToPath(new URL("../../../..", import.meta.url));

export type LoadedEnvFile = { path: string; keys: string[] };

function unquote(raw: string): string {
  const value = raw.trim();
  if (value.length >= 2) {
    const first = value[0];
    const last = value[value.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return value.slice(1, -1);
    }
  }
  return value;
}

export function parseEnvFile(contents: string): Record<string, string> {
  const env: Record<string, string> = {};
  for (const rawLine of contents.split("\n")) {
    const line = rawLine.trim();
    if (line.length === 0 || line.startsWith("#")) continue;
    const withoutExport = line.startsWith("export ") ? line.slice(7).trim() : line;
    const eq = withoutExport.indexOf("=");
    if (eq <= 0) continue;
    const key = withoutExport.slice(0, eq).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    env[key] = unquote(withoutExport.slice(eq + 1));
  }
  return env;
}

export function resolveEnvFilePath(argv: readonly string[], env: NodeJS.ProcessEnv): string | null {
  const flagIndex = argv.indexOf("--env-file");
  const raw = flagIndex >= 0 ? argv[flagIndex + 1] : env.ENV_FILE;
  if (!raw) return null;
  return isAbsolute(raw) ? raw : join(process.cwd(), raw);
}

export function loadEnvFile(path: string, target: NodeJS.ProcessEnv = process.env): LoadedEnvFile {
  if (!existsSync(path)) throw new Error(`env file not found: ${path}`);
  const parsed = parseEnvFile(readFileSync(path, "utf8"));
  const keys: string[] = [];
  for (const [key, value] of Object.entries(parsed)) {
    if (target[key] !== undefined) continue;
    target[key] = value;
    keys.push(key);
  }
  return { path, keys };
}

export function defaultEnvFilePath(name: string): string {
  return join(V2_ROOT, name);
}
