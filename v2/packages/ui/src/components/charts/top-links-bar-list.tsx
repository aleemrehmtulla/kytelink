import { ACCENT, CHART_NEUTRAL } from "../../tokens";

export interface TopLinkDatum {
  linkUrl: string;
  linkTitle: string;
  clicks: number;
}

export interface TopLinksBarListProps {
  data: TopLinkDatum[];
  emptyLabel?: string;
}

export function TopLinksBarList({ data, emptyLabel = "No clicks yet" }: TopLinksBarListProps) {
  const max = data.reduce((acc, row) => Math.max(acc, row.clicks), 0) || 1;

  if (data.length === 0) {
    return (
      <div data-kytelink-top-links="" style={{ color: CHART_NEUTRAL.muted, fontSize: "13px" }}>
        {emptyLabel}
      </div>
    );
  }

  return (
    <ul
      data-kytelink-top-links=""
      style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "10px" }}
    >
      {data.map((row) => (
        <li key={row.linkUrl}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", fontSize: "13px" }}>
            <span
              title={row.linkUrl}
              style={{ color: "currentColor", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
            >
              {row.linkTitle}
            </span>
            <span style={{ color: "currentColor", fontWeight: 600 }}>{row.clicks.toLocaleString("en-US")}</span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={row.clicks}
            aria-valuemin={0}
            aria-valuemax={max}
            aria-label={`${row.linkTitle}: ${row.clicks} clicks`}
            style={{ background: CHART_NEUTRAL.track, borderRadius: "9999px", height: "8px", marginTop: "6px" }}
          >
            <div
              style={{
                width: `${Math.max(2, (row.clicks / max) * 100)}%`,
                background: ACCENT,
                height: "8px",
                borderRadius: "9999px",
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
