import { listenTextResolver, prettyLogging, taggedLogger } from "../logger";
import { paint } from "../log/pretty";
import { buildMockServer } from "./server";

process.env.ADMIN_EMAILS ??= "agent-admin@kytelink.dev";
process.env.WEB_BASE_URL ??= "http://localhost:3000";

const log = taggedLogger("boot");

const FIXTURE_USERS = [
  ["agent@kytelink.dev", "OWNER of org_agent_personal, MANAGER in org_agency_demo"],
  ["agent-admin@kytelink.dev", "platform ADMIN"],
  ["viewer@kytelink.dev", "VIEWER in org_agency_demo"],
] as const;

function banner(url: string): string {
  const lines = [
    "",
    `  ${paint("magenta", "kytelink mock api")}  ${paint("gray", "in-memory store, no database")}`,
    "",
    `  ${paint("gray", "url".padEnd(11))}${url}`,
    "",
    `  ${paint("gray", "pick a fixture user with the x-mock-user header:")}`,
    ...FIXTURE_USERS.map(
      ([email, role]) => `    ${paint("cyan", email.padEnd(26))}${paint("gray", role)}`,
    ),
    "",
    `  ${paint("gray", "for example:")}`,
    `    ${paint("cyan", `curl -H 'x-mock-user: agent@kytelink.dev' ${url}/trpc/account.me`)}`,
    "",
  ];
  return lines.join("\n") + "\n";
}

async function main(): Promise<void> {
  const { app } = await buildMockServer();
  const port = Number(process.env.MOCK_API_PORT ?? process.env.PORT ?? 3999);
  const host = process.env.HOST ?? "0.0.0.0";

  await app.listen({ port, host, listenTextResolver });
  const url = `http://localhost:${String(port)}`;
  if (prettyLogging) process.stdout.write(banner(url));
  else log.info({ port, host }, "mock api ready");
}

main().catch((error: unknown) => {
  log.fatal({ err: error }, "mock api failed to start");
  process.exit(1);
});
