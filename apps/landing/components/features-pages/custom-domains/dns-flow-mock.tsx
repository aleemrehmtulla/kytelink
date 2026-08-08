import type { DnsRecord, DomainStatus } from "@kytelink/schemas";
import { NEUTRAL, STATUS } from "@kytelink/ui";

const RECORDS: DnsRecord[] = [
  { type: "A", name: "@", value: "76.76.21.21" },
  { type: "CNAME", name: "www", value: "cname.kytelink.com" },
];

const STEPS: { status: DomainStatus; label: string }[] = [
  { status: "PENDING", label: "Domain added" },
  { status: "VERIFYING", label: "DNS records checked" },
  { status: "ACTIVE", label: "Live on your domain" },
];

const STATUS_COLOR: Record<DomainStatus, string> = {
  PENDING: NEUTRAL[400],
  VERIFYING: STATUS.warning,
  ACTIVE: STATUS.success,
  ERROR: STATUS.danger,
};

export function DnsFlowMock() {
  return (
    <div className="rounded-card border border-cardline bg-card p-5 sm:p-6">
      <h3 className="text-[13px] font-semibold text-ink">Connect a domain</h3>

      <ol className="mt-5 flex flex-col gap-3 sm:flex-row sm:gap-2">
        {STEPS.map((step, index) => (
          <li key={step.status} className="flex flex-1 items-center gap-2.5">
            <span
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-pill text-xs font-semibold text-white"
              style={{ backgroundColor: STATUS_COLOR[step.status] }}
            >
              {index + 1}
            </span>
            <span className="text-[13px] text-secondary">{step.label}</span>
          </li>
        ))}
      </ol>

      <div className="mt-6 overflow-hidden rounded-input border border-cardline">
        <table className="w-full text-left text-sm">
          <thead className="bg-canvas text-[11px] uppercase tracking-wide text-tertiary">
            <tr>
              <th className="px-3.5 py-2.5 font-medium">Type</th>
              <th className="px-3.5 py-2.5 font-medium">Name</th>
              <th className="px-3.5 py-2.5 font-medium">Value</th>
            </tr>
          </thead>
          <tbody>
            {RECORDS.map((record) => (
              <tr key={`${record.type}-${record.name}`} className="border-t border-hairline">
                <td className="px-3.5 py-2.5 font-mono text-xs text-ink">{record.type}</td>
                <td className="px-3.5 py-2.5 font-mono text-xs text-secondary">{record.name}</td>
                <td className="px-3.5 py-2.5 font-mono text-xs text-secondary">{record.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
