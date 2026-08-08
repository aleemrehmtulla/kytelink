import type { Capabilities } from "@kytelink/schemas";

const CAPABILITY_COPY: Record<keyof Capabilities, { label: string; env: string; fallback: string }> = {
  analytics: {
    label: "Analytics",
    env: "CLICKHOUSE_URL",
    fallback: "Beacon endpoints return 202 and drop. No Analytics tab. Everything else works.",
  },
  uploads: {
    label: "Uploads",
    env: "AWS_*",
    fallback: "Avatars fall back to generated initials. No upload tiles.",
  },
  emailDelivery: {
    label: "Email delivery",
    env: "RESEND_API_KEY / SMTP",
    fallback: "OTPs and invites print to the server console instead.",
  },
  moderation: {
    label: "Moderation",
    env: "OPENAI_API_KEY",
    fallback: "Publishes auto-approve. The moderation UI is invisible.",
  },
  oauthGoogle: {
    label: "Google login",
    env: "GOOGLE_CLIENT_ID/SECRET",
    fallback: "Button hidden. Email OTP always works.",
  },
  oauthGithub: {
    label: "GitHub login",
    env: "GITHUB_CLIENT_ID/SECRET",
    fallback: "Button hidden. Email OTP always works.",
  },
  domains: {
    label: "Custom domains",
    env: "CUSTOM_DOMAIN_* or VERCEL_*",
    fallback: "Custom-domain settings hidden. Profiles stay on /username.",
  },
};

const ORDER: (keyof Capabilities)[] = [
  "analytics",
  "uploads",
  "emailDelivery",
  "moderation",
  "oauthGoogle",
  "oauthGithub",
  "domains",
];

// Every key here mirrors packages/schemas' Capabilities type (env.ts) — the
// same object apps/api computes at boot (25-selfhost.md's capability matrix).
export function CapabilityGridMock() {
  return (
    <div className="rounded-card border border-cardline bg-card p-5 sm:p-6">
      <h3 className="text-[13px] font-semibold text-ink">Skip a service, nothing breaks</h3>
      <p className="mt-1.5 text-[13px] leading-relaxed text-secondary">
        Every optional capability degrades to a calm fallback — never a crash.
      </p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {ORDER.map((key) => (
          <div key={key} className="rounded-input border border-hairline bg-canvas p-3.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[13px] font-semibold text-ink">{CAPABILITY_COPY[key].label}</span>
              <code className="font-mono text-[11px] text-faint">{CAPABILITY_COPY[key].env}</code>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-secondary">{CAPABILITY_COPY[key].fallback}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
