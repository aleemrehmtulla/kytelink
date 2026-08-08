import { CHART_NEUTRAL } from "../../tokens";

export interface ReferrerDatum {
  refDomain: string;
  views: number;
}

export interface ReferrersListProps {
  data: ReferrerDatum[];
  emptyLabel?: string;
}

export function ReferrersList({ data, emptyLabel = "No referrers yet" }: ReferrersListProps) {
  if (data.length === 0) {
    return (
      <div data-kytelink-referrers="" style={{ color: CHART_NEUTRAL.muted, fontSize: "13px" }}>
        {emptyLabel}
      </div>
    );
  }

  return (
    <ul
      data-kytelink-referrers=""
      style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "8px" }}
    >
      {data.map((row) => (
        <li
          key={row.refDomain}
          style={{ display: "flex", justifyContent: "space-between", gap: "12px", fontSize: "13px" }}
        >
          <span style={{ color: "currentColor", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {row.refDomain || "Direct"}
          </span>
          <span style={{ color: "currentColor", fontWeight: 600 }}>{row.views.toLocaleString("en-US")}</span>
        </li>
      ))}
    </ul>
  );
}
