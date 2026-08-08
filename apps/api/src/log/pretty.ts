import { Writable } from "node:stream";

/**
 * Dev-only pretty stream. This runs in-process rather than as a pino transport
 * so that the API's own logger and fastify's request logger share one stream —
 * two transports mean two worker threads and interleaved, out-of-order lines.
 *
 * Layout is fixed-width so a running log scans as columns:
 *
 *   14:02:29  trpc     POST 200    11ms  kyte.list         agent@kytelink.dev
 *   14:02:30 !analytics dropped a beacon: envelope failed validation  kind=view
 */

const RESET = "\u001b[0m";
const CODES = {
  dim: "\u001b[2m",
  bold: "\u001b[1m",
  red: "\u001b[31m",
  green: "\u001b[32m",
  yellow: "\u001b[33m",
  magenta: "\u001b[35m",
  cyan: "\u001b[36m",
  gray: "\u001b[90m",
} as const;

type Color = keyof typeof CODES;

/** Message value that the pretty stream swallows entirely (see logger.ts). */
export const SILENCED = "\u0000kytelink:silenced";

const TAG_WIDTH = 9;
const GUTTER = " ".repeat(8 + 1 + 1 + TAG_WIDTH + 1);

// Emitted by pino, fastify, or our own request logger — all of them are either
// rendered into the line explicitly or deliberately dropped in dev.
const RENDERED_KEYS = new Set([
  "level",
  "time",
  "pid",
  "hostname",
  "name",
  "msg",
  "tag",
  "err",
  "req",
  "res",
  "reqId",
  "responseTime",
  "kind",
  "method",
  "status",
  "ms",
  "target",
  "actor",
  "note",
]);

interface LevelStyle {
  mark: string;
  color: Color;
}

const INFO_STYLE: LevelStyle = { mark: " ", color: "cyan" };

const LEVELS: Record<number, LevelStyle> = {
  10: { mark: "·", color: "gray" },
  20: { mark: "·", color: "gray" },
  30: INFO_STYLE,
  40: { mark: "!", color: "yellow" },
  50: { mark: "x", color: "red" },
  60: { mark: "X", color: "red" },
};

interface SerializedError {
  type?: string;
  message?: string;
  stack?: string;
}

interface LogRecord {
  level: number;
  time: number;
  msg?: string;
  tag?: string;
  err?: SerializedError;
  kind?: string;
  method?: string;
  status?: number;
  ms?: number;
  target?: string;
  actor?: string;
  note?: string;
  [key: string]: unknown;
}

export function shouldPrettyPrint(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.NODE_ENV === "production") return false;
  return env.LOG_FORMAT !== "json";
}

function colorsEnabled(env: NodeJS.ProcessEnv): boolean {
  if (env.NO_COLOR !== undefined && env.NO_COLOR !== "") return false;
  if (env.FORCE_COLOR !== undefined && env.FORCE_COLOR !== "") return true;
  return process.stdout.isTTY === true;
}

export function makePaint(enabled: boolean) {
  return (color: Color, text: string): string =>
    enabled ? `${CODES[color]}${text}${RESET}` : text;
}

type Paint = ReturnType<typeof makePaint>;

export const paint: Paint = makePaint(colorsEnabled(process.env));

function clockOf(time: number): string {
  const date = new Date(time);
  const pad = (n: number): string => String(n).padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function statusColor(status: number): Color {
  if (status >= 500) return "red";
  if (status >= 400) return "yellow";
  if (status >= 300) return "cyan";
  return "green";
}

/** Slow requests are the ones worth spotting, so only those get colored. */
function durationColor(ms: number): Color {
  if (ms >= 1000) return "red";
  if (ms >= 300) return "yellow";
  return "gray";
}

function formatValue(value: unknown): string {
  if (typeof value === "string") return value.includes(" ") ? JSON.stringify(value) : value;
  if (value === null || value === undefined) return String(value);
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function extraFieldsOf(record: LogRecord, paint: Paint): string {
  const pairs = Object.entries(record)
    .filter(([key, value]) => !RENDERED_KEYS.has(key) && value !== undefined)
    .map(([key, value]) => `${key}=${formatValue(value)}`);
  return pairs.length > 0 ? "  " + paint("gray", pairs.join(" ")) : "";
}

function requestBody(record: LogRecord, paint: Paint): string {
  const method = (record.method ?? "?").padEnd(4);
  const status = String(record.status ?? 0);
  const ms = `${String(record.ms ?? 0)}ms`.padStart(7);
  const target = record.target ?? "";
  const trailing = [record.actor, record.note].filter(
    (part): part is string => part !== undefined && part.length > 0,
  );

  const head = `${method} ${paint(statusColor(record.status ?? 0), status)} ${paint(
    durationColor(record.ms ?? 0),
    ms,
  )}  `;
  if (trailing.length === 0) return head + target;
  return head + target.padEnd(28) + "  " + paint("gray", trailing.join("  "));
}

function errorLines(err: SerializedError, level: number, paint: Paint): string[] {
  const headline = [err.type, err.message].filter(Boolean).join(": ");
  const lines = [`${GUTTER}${paint("red", `↳ ${headline || "unknown error"}`)}`];
  // A stack is only actionable for a real fault; 4xx warns just name themselves.
  if (level >= 50 && err.stack !== undefined) {
    const frames = err.stack
      .split("\n")
      .filter((line) => line.trimStart().startsWith("at "))
      .slice(0, 4);
    for (const frame of frames) lines.push(`${GUTTER}${paint("gray", `  ${frame.trim()}`)}`);
  }
  return lines;
}

export function formatRecord(record: LogRecord, paint: Paint): string | null {
  if (record.msg === SILENCED) return null;

  const style = LEVELS[record.level] ?? INFO_STYLE;
  const tag = (record.tag ?? "api").slice(0, TAG_WIDTH).padEnd(TAG_WIDTH);
  const prefix = `${paint("gray", clockOf(record.time))} ${paint(
    style.color,
    style.mark,
  )}${paint(style.color, tag)} `;

  const body =
    record.kind === "request"
      ? requestBody(record, paint)
      : (record.msg ?? "") + extraFieldsOf(record, paint);

  const [first = "", ...rest] = body.split("\n");
  const lines = [prefix + first, ...rest.map((line) => GUTTER + line)];
  if (record.err) lines.push(...errorLines(record.err, record.level, paint));
  return lines.join("\n");
}

export function createPrettyStream(): Writable {
  return new Writable({
    write(chunk: Buffer, _encoding, callback) {
      const raw = chunk.toString("utf8").trim();
      if (raw.length === 0) {
        callback();
        return;
      }
      for (const line of raw.split("\n")) {
        let rendered: string | null;
        try {
          rendered = formatRecord(JSON.parse(line) as LogRecord, paint);
        } catch {
          rendered = line;
        }
        if (rendered !== null) process.stdout.write(rendered + "\n");
      }
      callback();
    },
  });
}
