import type { ReactNode } from "react";
import { NextSeo } from "next-seo";
import { PageShell } from "../components/layout/page-shell";
import { Container } from "../components/ui/container";
import { GithubIcon } from "../components/ui/brand-icons";
import { HowToJsonLd } from "../components/seo/json-ld";
import { GITHUB_REPO, GITHUB_REPO_URL } from "../consts/site";
import { buildPageSeo } from "../lib/seo/build-page-seo";

type TerminalLine = { text: string; kind: "cmd" | "comment" | "output" };

const QUICK_START: TerminalLine[] = [
  { text: `git clone ${GITHUB_REPO_URL}.git && cd ${GITHUB_REPO}`, kind: "cmd" },
  { text: "pnpm install", kind: "cmd" },
  { text: "pnpm run setup", kind: "cmd" },
  { text: "# asks what you want (Postgres is the only must), then writes", kind: "comment" },
  { text: "# .env with fresh secrets, starts Docker, migrates, and seeds", kind: "comment" },
  { text: "pnpm dev", kind: "cmd" },
  { text: "→ web:3000 · landing:3001 · admin:3002 · api:3003 🪁", kind: "output" },
];

const QUICK_START_STEPS = QUICK_START.filter((line) => line.kind === "cmd").map(
  (line) => line.text,
);

const PROMISE_ROWS: [string, string][] = [
  ["Cloudflare R2", "MinIO, or any S3-compatible bucket"],
  ["Resend", "SMTP (any provider, or your own Postfix)"],
  ["ClickHouse Cloud", "ClickHouse OSS (a VM, or the compose service)"],
  ["Neon (Postgres)", "Plain Postgres (compose, RDS, your own box)"],
  ["OpenAI", "Any OpenAI-compatible endpoint, incl. local models"],
  ["Vercel domain automation", "Manual DNS"],
];

interface ServiceCard {
  name: string;
  required: boolean;
  note: string;
  summary: string;
  vars: string[];
}

const SERVICES: ServiceCard[] = [
  {
    name: "Postgres",
    required: true,
    note: "Required",
    summary:
      "The primary datastore: users, kytes, memberships, invites, assets, domains, moderation, schedules. Any Postgres 16+ works.",
    vars: ["DATABASE_URL", "DIRECT_URL"],
  },
  {
    name: "Redis",
    required: true,
    note: "Required",
    summary: "Caches, rate limits, BullMQ queues, and the beacon buffer. Any Redis 7+ (or protocol-compatible store).",
    vars: ["REDIS_URL"],
  },
  {
    name: "ClickHouse",
    required: false,
    note: "Optional · analytics",
    summary: "Backs page, link, and product analytics and their rollups. Skip it entirely and the app runs with analytics off.",
    vars: ["CLICKHOUSE_URL", "CLICKHOUSE_PASSWORD"],
  },
  {
    name: "S3 storage",
    required: false,
    note: "Optional · uploads",
    summary: "Owned static assets and user uploads share one bucket. Any S3 API works: MinIO locally, Cloudflare R2, or AWS S3.",
    vars: ["AWS_ENDPOINT_URL", "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_REGION", "AWS_S3_BUCKET", "NEXT_PUBLIC_CDN_URL"],
  },
  {
    name: "Email",
    required: false,
    note: "Optional · smtp default",
    summary: "Three backends via EMAIL_PROVIDER: console (stdout), smtp (mailpit locally, Postfix in prod), or resend.",
    vars: ["EMAIL_PROVIDER", "EMAIL_FROM", "SMTP_HOST", "SMTP_PORT", "RESEND_API_KEY"],
  },
  {
    name: "Moderation + AI import",
    required: false,
    note: "Optional · off",
    summary: "MODERATION_PROVIDER=none auto-approves everything. Set openai to enable moderation and the AI link importer.",
    vars: ["MODERATION_PROVIDER", "OPENAI_API_KEY", "OPENAI_BASE_URL", "MODERATION_MODEL"],
  },
  {
    name: "Custom domains",
    required: false,
    note: "Optional · proxy",
    summary:
      "DOMAIN_PROVIDER=proxy verifies by DNS and lets your reverse proxy issue certificates on demand — point CUSTOM_DOMAIN_A_RECORD/CNAME_TARGET at your edge and run the shipped Caddy config. On Vercel, set vercel with an API token instead.",
    vars: [
      "DOMAIN_PROVIDER",
      "CUSTOM_DOMAIN_A_RECORD",
      "CUSTOM_DOMAIN_CNAME_TARGET",
      "VERCEL_TOKEN",
      "VERCEL_TEAM",
      "VERCEL_PROJECT",
    ],
  },
];

interface CapabilityRow {
  missing: string;
  capability: string;
  behaviour: string;
}

const CAPABILITY_ROWS: CapabilityRow[] = [
  {
    missing: "CLICKHOUSE_URL",
    capability: "analytics",
    behaviour:
      "Beacon endpoints return 202 and drop; no Analytics tab in the editor; admin shows a calm “Analytics is off” card. Everything else works.",
  },
  {
    missing: "AWS_* (S3)",
    capability: "uploads",
    behaviour:
      "Upload tiles hidden; onboarding offers built-in default avatars; OG cards fall back to text-only. Owned static assets still serve.",
  },
  {
    missing: "RESEND_API_KEY / SMTP",
    capability: "emailDelivery",
    behaviour:
      "OTPs and invites print to server stdout. Set EMAIL_PROVIDER=smtp against mailpit to read them in an inbox instead.",
  },
  {
    missing: "OPENAI_API_KEY",
    capability: "moderation",
    behaviour:
      "Publishes auto-approve and the AI “Other” importer hides. Linktree/Beacons/Bio.link imports still work (deterministic parsers).",
  },
  {
    missing: "GOOGLE_* / GITHUB_*",
    capability: "that OAuth button",
    behaviour: "The button is hidden from the auth screen; email OTP always works.",
  },
  {
    missing: "VERCEL_*",
    capability: "domains",
    behaviour: "The custom-domain UI shows DNS instructions instead of automated verification.",
  },
];

const PRODUCTION_NOTES: { title: string; body: string }[] = [
  {
    title: "ISR cache volume",
    body: "apps/web's Next.js ISR cache should live on a persistent volume in production, or page revalidation resets on every deploy.",
  },
  {
    title: "Run workers separately",
    body: "Set PROCESS_ROLE=worker on a dedicated process for the BullMQ workers — don't run them inline with the process serving HTTP traffic.",
  },
  {
    title: "Back up Postgres",
    body: "Postgres is the can't-lose store. Use pg_dump on a schedule, or point-in-time recovery if your provider offers it.",
  },
  {
    title: "Back up your bucket",
    body: "The S3 bucket holds irreplaceable user uploads. Periodic sync or cross-region replication is recommended. ClickHouse loss is accepted as lossy.",
  },
];

function SectionLabel({ children }: { children: ReactNode }) {
  return <div className="text-xs font-semibold uppercase tracking-[0.06em] text-accent">{children}</div>;
}

function Terminal({ lines }: { lines: TerminalLine[] }) {
  return (
    <div className="w-full overflow-x-auto rounded-menu border border-dark-border bg-dark-card p-5 font-mono text-[13px] leading-[2] text-dark-text">
      <div className="mb-3 flex gap-1.5" aria-hidden="true">
        <span className="h-[9px] w-[9px] rounded-pill bg-dark-dot" />
        <span className="h-[9px] w-[9px] rounded-pill bg-dark-dot" />
        <span className="h-[9px] w-[9px] rounded-pill bg-dark-dot" />
      </div>
      {lines.map((line) => {
        if (line.kind === "output") {
          return (
            <div key={line.text} className="whitespace-pre text-accent-on-dark">
              {line.text}
            </div>
          );
        }
        if (line.kind === "comment") {
          return (
            <div key={line.text} className="whitespace-pre text-dark-muted">
              {line.text}
            </div>
          );
        }
        return (
          <div key={line.text} className="whitespace-pre">
            <span className="text-dark-muted">$</span> {line.text}
          </div>
        );
      })}
    </div>
  );
}

function VarChip({ name }: { name: string }) {
  return (
    <span className="rounded-[8px] bg-tint px-2 py-1 font-mono text-[12px] text-ink">{name}</span>
  );
}

export function SelfHostingPage() {
  return (
    <>
      <NextSeo
        {...buildPageSeo({
          path: "/self-hosting",
          title: "Self-hosting Kytelink",
          description:
            "Run your own Kytelink in three commands. Every hosted service has a drop-in open-source equivalent — here's the env-var reference and capability matrix.",
        })}
      />
      <HowToJsonLd
        name="Self-host Kytelink"
        description="Clone the repo, install dependencies, run the setup wizard, and start the stack on your own machine."
        steps={QUICK_START_STEPS}
      />
      <PageShell>
        <Container className="pb-16 pt-14 sm:pb-24 sm:pt-20">
          <div className="flex flex-col items-center text-center">
            <h1 className="max-w-[760px] text-balance text-[34px] font-bold leading-[1.08] tracking-[-0.03em] text-ink sm:text-5xl">
              Host it yourself, in three commands.
            </h1>
            <p className="mt-5 max-w-[560px] text-pretty text-[17px] leading-relaxed text-secondary">
              Kytelink is open source, ground up. Nothing is closed, and every third-party service has a
              drop-in open-source or self-hostable equivalent. Run it on your own box, or use ours — either
              way it costs nothing.
            </p>
          </div>

          <div className="mx-auto mt-14 flex max-w-[760px] flex-col gap-16 sm:mt-20 sm:gap-20">
            <section className="flex flex-col gap-5">
              <SectionLabel>The promise</SectionLabel>
              <h2 className="text-[24px] font-bold tracking-[-0.02em] text-ink sm:text-[28px]">
                Every hosted piece has an open swap-in.
              </h2>
              <p className="text-[15px] leading-relaxed text-secondary">
                The founder&apos;s hosted config is one example configuration, not a requirement. The app code
                never assumes a provider — it only speaks standard protocols: the Postgres wire protocol,
                Redis, the S3 API, SMTP, and OpenAI&apos;s HTTP shape.
              </p>
              <div className="overflow-hidden rounded-card border border-cardline bg-white">
                <table className="w-full border-collapse text-left text-[14px]">
                  <thead>
                    <tr className="border-b border-hairline">
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-[0.06em] text-tertiary">
                        Hosted stack
                      </th>
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-[0.06em] text-tertiary">
                        Self-hosted equivalent
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {PROMISE_ROWS.map(([hosted, oss]) => (
                      <tr key={hosted} className="border-b border-hairline last:border-b-0">
                        <td className="px-5 py-3 font-medium text-ink">{hosted}</td>
                        <td className="px-5 py-3 text-secondary">{oss}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="flex flex-col gap-5">
              <SectionLabel>Fastest path</SectionLabel>
              <h2 className="text-[24px] font-bold tracking-[-0.02em] text-ink sm:text-[28px]">
                Three commands to a live stack.
              </h2>
              <p className="text-[15px] leading-relaxed text-secondary">
                One interactive wizard handles the whole first boot. Postgres and Redis are the only hard
                requirement — it runs them in Docker for you. Analytics, uploads, and a local email inbox
                are each one y/n question; skip any of them and that feature simply switches off gracefully.
              </p>
              <Terminal lines={QUICK_START} />
              <p className="text-[15px] leading-relaxed text-secondary">
                Change your mind later by re-running the wizard or editing <span className="font-mono text-[13px]">.env</span> —
                and if you run <span className="font-mono text-[13px]">pnpm dev</span> before setting up, it stops with the
                exact command to run instead of crashing.
              </p>
            </section>

            <section className="flex flex-col gap-5">
              <SectionLabel>Per-service setup</SectionLabel>
              <h2 className="text-[24px] font-bold tracking-[-0.02em] text-ink sm:text-[28px]">
                Wire up what you need.
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {SERVICES.map((service) => (
                  <div
                    key={service.name}
                    className="flex flex-col rounded-card border border-cardline bg-white p-5"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[15px] font-semibold text-ink">{service.name}</span>
                      <span
                        className={`rounded-pill px-2.5 py-1 text-[11px] font-medium ${
                          service.required ? "bg-accent-soft text-accent" : "bg-tint text-tertiary"
                        }`}
                      >
                        {service.note}
                      </span>
                    </div>
                    <p className="mt-2.5 text-[13px] leading-relaxed text-secondary">{service.summary}</p>
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {service.vars.map((name) => (
                        <VarChip key={name} name={name} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="flex flex-col gap-5">
              <SectionLabel>Capability matrix</SectionLabel>
              <h2 className="text-[24px] font-bold tracking-[-0.02em] text-ink sm:text-[28px]">
                What turns off, gracefully.
              </h2>
              <p className="text-[15px] leading-relaxed text-secondary">
                A disabled capability always means the UI surface is absent or replaced with one calm card —
                never a broken button. Its tRPC procedures return a typed FEATURE_DISABLED error as the
                backstop.
              </p>
              <div className="overflow-x-auto rounded-card border border-cardline bg-white">
                <table className="w-full min-w-[560px] border-collapse text-left text-[14px]">
                  <thead>
                    <tr className="border-b border-hairline">
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-[0.06em] text-tertiary">
                        Missing
                      </th>
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-[0.06em] text-tertiary">
                        Off
                      </th>
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-[0.06em] text-tertiary">
                        What the user sees
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {CAPABILITY_ROWS.map((row) => (
                      <tr key={row.missing} className="border-b border-hairline align-top last:border-b-0">
                        <td className="whitespace-nowrap px-5 py-3.5 font-mono text-[12px] text-ink">
                          {row.missing}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3.5 font-medium text-ink">{row.capability}</td>
                        <td className="px-5 py-3.5 text-secondary">{row.behaviour}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="flex flex-col gap-5">
              <SectionLabel>Production notes</SectionLabel>
              <h2 className="text-[24px] font-bold tracking-[-0.02em] text-ink sm:text-[28px]">
                Before you go live.
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {PRODUCTION_NOTES.map((note) => (
                  <div key={note.title} className="rounded-card border border-cardline bg-white p-5">
                    <div className="text-[14px] font-semibold text-ink">{note.title}</div>
                    <p className="mt-2 text-[13px] leading-relaxed text-secondary">{note.body}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="flex flex-col items-center gap-6 rounded-panel bg-hero-wash px-6 py-12 text-center sm:py-14">
              <h2 className="text-[24px] font-bold tracking-[-0.02em] text-ink sm:text-[28px]">
                Read every line, then run it.
              </h2>
              <p className="max-w-[440px] text-[15px] leading-relaxed text-secondary">
                The full guide, docker-compose file, and env reference live in the repo. It&apos;s yours.
              </p>
              <a
                href={GITHUB_REPO_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex cursor-pointer items-center gap-2 rounded-pill bg-accent px-7 py-3.5 text-sm font-medium text-white shadow-cta outline-none transition-colors hover:bg-accent-hover"
              >
                <GithubIcon width={17} height={17} />
                View on GitHub
              </a>
            </section>
          </div>
        </Container>
      </PageShell>
    </>
  );
}

export default SelfHostingPage;
