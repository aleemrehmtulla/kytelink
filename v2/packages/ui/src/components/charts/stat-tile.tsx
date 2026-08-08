import type { CSSProperties } from "react";
import { CHART_NEUTRAL, RADIUS, STATUS } from "../../tokens";

export interface StatTileProps {
  label: string;
  value: number | string;
  delta?: number;
  hint?: string;
}

const cardStyle: CSSProperties = {
  border: `1px solid ${CHART_NEUTRAL.border}`,
  borderRadius: RADIUS.lg,
  padding: "16px",
  display: "flex",
  flexDirection: "column",
  gap: "4px",
  minWidth: "140px",
};

function formatValue(value: number | string): string {
  return typeof value === "number" ? value.toLocaleString("en-US") : value;
}

export function StatTile({ label, value, delta, hint }: StatTileProps) {
  const hasDelta = delta !== undefined;
  const positive = hasDelta && delta >= 0;
  const deltaColor = !hasDelta ? undefined : positive ? STATUS.success : STATUS.danger;
  const deltaLabel = hasDelta
    ? `${positive ? "Up" : "Down"} ${Math.abs(delta)} percent versus the previous period`
    : undefined;

  return (
    <div data-kytelink-stat-tile="" style={cardStyle}>
      <span style={{ fontSize: "12px", color: CHART_NEUTRAL.muted }}>{label}</span>
      <span
        style={{
          fontSize: "28px",
          fontWeight: 700,
          letterSpacing: "-0.02em",
          color: "currentColor",
          lineHeight: 1.1,
        }}
      >
        {formatValue(value)}
      </span>
      {hasDelta ? (
        <span
          style={{ fontSize: "12px", color: deltaColor, display: "inline-flex", gap: "3px" }}
          aria-label={deltaLabel}
        >
          <span aria-hidden="true">{positive ? "▲" : "▼"}</span>
          {Math.abs(delta)}%
        </span>
      ) : null}
      {hint ? <span style={{ fontSize: "12px", color: CHART_NEUTRAL.muted }}>{hint}</span> : null}
    </div>
  );
}
