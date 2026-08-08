import { networkInterfaces } from "node:os";
import { paint } from "./pretty";
import type { ApiConfig } from "../config";

/**
 * The block a dev reads once per boot. Everything in it is either a URL to
 * open or a command to paste — no status chatter, which belongs in the log
 * lines underneath.
 */

const COOKIE_JAR = "/tmp/kyte-cookies";

interface BannerInput {
  config: ApiConfig;
  addresses: string[];
  port: number;
  /** Seconds since the process started — the number a dev actually feels. */
  bootSeconds: number;
}

function row(label: string, value: string): string {
  return `  ${paint("gray", label.padEnd(11))}${value}`;
}

function heading(text: string): string {
  return `  ${paint("gray", text)}`;
}

function command(lines: string[]): string[] {
  return lines.map((line) => `    ${paint("cyan", line)}`);
}

function roleSummary(config: ApiConfig): string {
  const parts: string[] = [];
  if (config.processRole !== "worker") parts.push("http server");
  if (config.processRole !== "server") parts.push("background workers");
  if (config.agentMode) parts.push("agent mode");
  return parts.join(" · ");
}

/** The address a wildcard bind reports, which is not a URL anyone can open. */
const WILDCARD = new Set(["0.0.0.0", "::", "[::]"]);

/** First non-internal IPv4 — what a phone on the same wifi has to point at. */
function lanAddress(): string | undefined {
  for (const entries of Object.values(networkInterfaces())) {
    for (const entry of entries ?? []) {
      if (entry.family === "IPv4" && !entry.internal) return entry.address;
    }
  }
  return undefined;
}

/**
 * The loopback URL is what a dev clicks; the LAN URL is the only other one
 * worth printing, and only when the socket actually accepts outside traffic.
 */
function urlsFrom(addresses: string[], port: number): { local: string; network?: string } {
  const hosts = addresses.map((address) => address.replace(/:\d+$/, ""));
  const wildcard = hosts.some((host) => WILDCARD.has(host));
  const local = `http://localhost:${String(port)}`;
  if (!wildcard) {
    const external = hosts.find((host) => host !== "127.0.0.1" && host !== "localhost");
    return { local, network: external ? `http://${external}:${String(port)}` : undefined };
  }
  const lan = lanAddress();
  return { local, network: lan ? `http://${lan}:${String(port)}` : undefined };
}

function signInBlock(config: ApiConfig, api: string): string[] {
  if (config.agentMode) {
    return [
      heading("sign in from a shell — mints a real session cookie:"),
      ...command([
        `curl -sc ${COOKIE_JAR} -X POST ${api}/auth/dev-login \\`,
        `  -H 'content-type: application/json' \\`,
        `  -d '{"email":"agent@kytelink.dev"}'`,
      ]),
      "",
      heading("then call any procedure with that cookie:"),
      ...command([`curl -sb ${COOKIE_JAR} ${api}/trpc/account.me`]),
    ];
  }
  return [
    heading("request a login code — it prints below as an `auth` line:"),
    ...command([
      `curl -s -X POST ${api}/auth/email-otp/send-verification-otp \\`,
      `  -H 'content-type: application/json' \\`,
      `  -d '{"email":"you@example.com","type":"sign-in"}'`,
    ]),
  ];
}

function renderBanner({ config, addresses, port, bootSeconds }: BannerInput): string {
  const { local, network } = urlsFrom(addresses, port);
  const seconds = bootSeconds.toFixed(1);

  const lines = [
    "",
    `  ${paint("magenta", "kytelink api")}  ${paint("gray", `ready in ${seconds}s`)}`,
    "",
    row("local", local),
    ...(network ? [row("network", network)] : []),
    row("web app", config.webBaseUrl),
    row("readiness", `${local}/readyz`),
    row("running", roleSummary(config)),
    "",
    ...signInBlock(config, local),
    "",
  ];
  return lines.join("\n") + "\n";
}

export function printBanner(input: BannerInput): void {
  process.stdout.write(renderBanner(input));
}
