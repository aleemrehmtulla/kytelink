import type { ReactNode } from "react";
import { getCdnUrl } from "@kytelink/cdn";
import { Container } from "../ui/container";
import { Eyebrow } from "../ui/section";
import { DEMO_ORG, DEMO_ORG_KYTES, DEMO_ORG_MEMBERS } from "../../consts/org-demo";

const CHART_POINTS = [
  34, 33, 35, 32, 36, 38, 37, 40, 42, 41, 44, 47, 46, 50, 53, 52, 56, 60, 63, 62, 67, 72, 76, 74,
];

function AnalyticsChart() {
  const width = 480;
  const height = 120;
  const max = 80;
  const step = width / (CHART_POINTS.length - 1);
  const points = CHART_POINTS.map((value, index) => `${index * step},${height - (value / max) * height}`);
  const line = points.join(" ");
  const area = `0,${height} ${line} ${width},${height}`;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="mt-6 w-full" aria-hidden="true">
      <polygon points={area} fill="#6D5AE6" opacity="0.08" />
      <polyline
        points={line}
        fill="none"
        stroke="#6D5AE6"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AnalyticsCard() {
  const stats = [
    { label: "Page views", value: "488" },
    { label: "Clicks", value: "183" },
    { label: "Rate", value: "37%" },
  ];
  return (
    <div className="rounded-panel border border-cardline bg-card p-5 shadow-card-rest sm:p-7">
      <div className="grid grid-cols-3 gap-3">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-card border border-hairline bg-canvas px-4 py-4">
            <div className="text-xs text-tertiary">{stat.label}</div>
            <div className="mt-1.5 text-[24px] font-bold tracking-[-0.02em] text-ink sm:text-[28px]">
              {stat.value}
            </div>
          </div>
        ))}
      </div>
      <AnalyticsChart />
    </div>
  );
}

function SpeedCard() {
  const scores = [
    { label: "Performance", value: "100" },
    { label: "Accessibility", value: "100" },
    { label: "Best practices", value: "100" },
    { label: "SEO", value: "100" },
  ];
  return (
    <div className="rounded-panel border border-cardline bg-card px-5 py-10 shadow-card-rest sm:px-7 sm:py-14">
      <div className="text-center">
        <div className="text-[56px] font-bold leading-none tracking-[-0.03em] text-ink">
          0.2<span className="text-[28px] font-semibold text-faint">s</span>
        </div>
        <div className="mt-2 text-sm text-tertiary">median page load</div>
      </div>
      <div className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-4">
        {scores.map((score) => (
          <div key={score.label} className="text-center">
            <div className="text-[22px] font-bold tracking-[-0.02em] text-accent">{score.value}</div>
            <div className="mt-1 text-xs text-tertiary">{score.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function OrgLogo({ src, alt, className }: { src: string; alt: string; className: string }) {
  return (
    <img
      src={getCdnUrl(src)}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={`${className} flex-shrink-0 rounded-pill border border-hairline bg-white object-cover`}
    />
  );
}

function OrganizationsCard() {
  return (
    <div className="rounded-panel border border-cardline bg-card p-5 shadow-card-rest sm:p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <OrgLogo src={DEMO_ORG.logo} alt={DEMO_ORG.name} className="h-10 w-10" />
          <div>
            <div className="text-[15px] font-semibold text-ink">{DEMO_ORG.name}</div>
            <div className="text-xs text-tertiary">{DEMO_ORG.members} members</div>
          </div>
        </div>
        <div className="flex items-center">
          {DEMO_ORG_MEMBERS.map((member) => (
            <img
              key={member.name}
              src={getCdnUrl(member.photo)}
              alt={member.name}
              loading="lazy"
              decoding="async"
              className="-ml-2 h-7 w-7 rounded-pill border-2 border-card object-cover first:ml-0"
            />
          ))}
          <span className="-ml-2 flex h-7 min-w-7 items-center justify-center rounded-pill border-2 border-card bg-accent-soft px-1 text-[10px] font-semibold text-accent">
            +{DEMO_ORG.members - DEMO_ORG_MEMBERS.length}
          </span>
        </div>
      </div>
      <div className="mt-5 flex flex-col gap-3">
        {DEMO_ORG_KYTES.map((kyte) => (
          <div
            key={kyte.name}
            className="flex items-center justify-between gap-3 rounded-card border border-hairline bg-card px-4 py-3.5"
          >
            <div className="flex min-w-0 items-center gap-3">
              <OrgLogo src={kyte.logo} alt={kyte.name} className="h-8 w-8" />
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-ink">{kyte.name}</div>
                <div className="truncate text-xs text-faint">kytelink.com/{kyte.handle}</div>
              </div>
            </div>
            <span className="flex-shrink-0 rounded-pill bg-success/10 px-3 py-1 text-xs font-medium text-success">
              Live
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FeatureRow({
  eyebrow,
  title,
  body,
  bullets,
  card,
  flip = false,
}: {
  eyebrow: string;
  title: ReactNode;
  body: string;
  bullets?: string[];
  card: ReactNode;
  flip?: boolean;
}) {
  return (
    <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-20">
      <div className={flip ? "lg:order-2" : ""}>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h2 className="mt-3 max-w-md text-balance text-[28px] font-bold leading-tight tracking-[-0.025em] text-ink sm:text-4xl">
          {title}
        </h2>
        <p className="mt-4 max-w-lg text-pretty text-[15px] leading-relaxed text-secondary sm:text-base">
          {body}
        </p>
        {bullets ? (
          <ul className="mt-6 flex flex-col gap-2.5">
            {bullets.map((bullet) => (
              <li key={bullet} className="flex items-center gap-3 text-sm text-secondary">
                <span className="h-1.5 w-1.5 flex-shrink-0 rounded-pill bg-accent" aria-hidden="true" />
                {bullet}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <div className={flip ? "lg:order-1" : ""}>{card}</div>
    </div>
  );
}

export function DeepFeatures() {
  return (
    <Container className="flex flex-col gap-24 py-16 sm:gap-32 sm:py-24">
      <FeatureRow
        eyebrow="Analytics"
        title={
          <>
            Know what&apos;s working.
            <br />
            Privately.
          </>
        }
        body="Page views, link clicks, traffic sources, devices, and countries — all measured without cookies or creepy trackers. Your visitors' data stays theirs; your numbers stay yours."
        card={<AnalyticsCard />}
      />
      <FeatureRow
        flip
        eyebrow="Speed"
        title="Faster than your bio deserves."
        body="Every page is statically rendered and cached at the edge, close to your visitors. No render-blocking scripts, no megabytes of tracker JavaScript — just your links, instantly."
        card={<SpeedCard />}
      />
      <FeatureRow
        eyebrow="Organizations"
        title="One home for every Kytelink."
        body="Create an organization for your team, band, or club. Invite people with a role, keep as many Kytelinks as you need under one roof, and switch between them in a click."
        bullets={[
          "Unlimited Kytelinks per organization",
          "Invite teammates as owners or editors",
          "Shared analytics and storage",
        ]}
        card={<OrganizationsCard />}
      />
    </Container>
  );
}
