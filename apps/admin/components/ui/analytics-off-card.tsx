export interface AnalyticsOffCardProps {
  view: string;
}

export function AnalyticsOffCard({ view }: AnalyticsOffCardProps) {
  return (
    <div className="rounded-card border-cardline bg-card flex flex-col items-center gap-2 border py-16 text-center">
      <span className="text-2xl" aria-hidden="true">
        🪁
      </span>
      <p className="text-ink text-[13px] font-medium">Analytics is off</p>
      <p className="text-secondary max-w-sm text-[13px] leading-relaxed">
        {view} needs ClickHouse. Set{" "}
        <code className="bg-tint text-ink rounded-[6px] px-1 py-0.5 font-mono text-[12px]">
          CLICKHOUSE_URL
        </code>{" "}
        (and{" "}
        <code className="bg-tint text-ink rounded-[6px] px-1 py-0.5 font-mono text-[12px]">
          CLICKHOUSE_PASSWORD
        </code>
        ) to turn it back on — see SELF-HOSTING.md. Everything else keeps working.
      </p>
    </div>
  );
}
