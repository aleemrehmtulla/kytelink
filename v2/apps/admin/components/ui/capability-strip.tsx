import type { Capabilities } from "@kytelink/schemas";

const LABELS: Record<keyof Capabilities, string> = {
  analytics: "Analytics",
  uploads: "Uploads",
  emailDelivery: "Email delivery",
  moderation: "Moderation",
  oauthGoogle: "Google login",
  oauthGithub: "GitHub login",
  domains: "Custom domains",
};

export function CapabilityStrip({ capabilities }: { capabilities: Capabilities }) {
  const entries = Object.entries(capabilities) as [keyof Capabilities, boolean][];
  return (
    <ul className="flex flex-wrap gap-2" aria-label="Deployment capabilities">
      {entries.map(([key, on]) => (
        <li
          key={key}
          className={`rounded-pill inline-flex items-center gap-1.5 px-2.5 py-1 text-[12px] font-medium ${
            on ? "bg-success-soft text-success" : "bg-tint text-tertiary"
          }`}
        >
          <span
            className={`rounded-pill h-1.5 w-1.5 ${on ? "bg-success" : "bg-faint"}`}
            aria-hidden="true"
          />
          {LABELS[key]}
        </li>
      ))}
    </ul>
  );
}
