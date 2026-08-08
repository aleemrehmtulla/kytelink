import { ACCENT, CHART_NEUTRAL } from "../../tokens";

export interface CountryDatum {
  country: string;
  views: number;
}

export interface CountrySplitProps {
  data: CountryDatum[];
  emptyLabel?: string;
}

export function CountrySplit({ data, emptyLabel = "No country data yet" }: CountrySplitProps) {
  const max = data.reduce((acc, row) => Math.max(acc, row.views), 0) || 1;

  if (data.length === 0) {
    return (
      <div data-kytelink-country-split="" style={{ color: CHART_NEUTRAL.muted, fontSize: "13px" }}>
        {emptyLabel}
      </div>
    );
  }

  return (
    <ul
      data-kytelink-country-split=""
      style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "8px" }}
    >
      {data.map((row) => (
        <li key={row.country} style={{ fontSize: "13px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
            <span style={{ color: "currentColor" }}>{row.country || "Unknown"}</span>
            <span style={{ color: "currentColor", fontWeight: 600 }}>{row.views.toLocaleString("en-US")}</span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={row.views}
            aria-valuemin={0}
            aria-valuemax={max}
            aria-label={`${row.country || "Unknown"}: ${row.views} views`}
            style={{ background: CHART_NEUTRAL.track, borderRadius: "9999px", height: "8px", marginTop: "6px" }}
          >
            <div
              style={{
                width: `${Math.max(2, (row.views / max) * 100)}%`,
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
