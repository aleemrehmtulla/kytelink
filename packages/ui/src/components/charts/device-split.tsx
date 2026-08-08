import type { DeviceType } from "@kytelink/schemas";
import { CHART_NEUTRAL, CHART_SERIES_COLORS } from "../../tokens";

export interface DeviceDatum {
  device: DeviceType;
  views: number;
}

export interface DeviceSplitProps {
  data: DeviceDatum[];
  emptyLabel?: string;
}

const DEVICE_LABEL: Record<DeviceType, string> = {
  MOBILE: "Mobile",
  TABLET: "Tablet",
  DESKTOP: "Desktop",
  UNKNOWN: "Unknown",
};

export function DeviceSplit({ data, emptyLabel = "No device data yet" }: DeviceSplitProps) {
  const total = data.reduce((acc, row) => acc + row.views, 0);

  if (total === 0) {
    return (
      <div data-kytelink-device-split="" style={{ color: CHART_NEUTRAL.muted, fontSize: "13px" }}>
        {emptyLabel}
      </div>
    );
  }

  return (
    <div data-kytelink-device-split="" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <div
        role="img"
        aria-label={data.map((row) => `${DEVICE_LABEL[row.device]} ${Math.round((row.views / total) * 100)}%`).join(", ")}
        style={{ display: "flex", height: "10px", borderRadius: "9999px", overflow: "hidden", background: CHART_NEUTRAL.track }}
      >
        {data.map((row, index) => (
          <div
            key={row.device}
            style={{
              width: `${(row.views / total) * 100}%`,
              background: CHART_SERIES_COLORS[index % CHART_SERIES_COLORS.length],
            }}
          />
        ))}
      </div>
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", gap: "14px", flexWrap: "wrap", fontSize: "12px" }}>
        {data.map((row, index) => (
          <li key={row.device} style={{ color: CHART_NEUTRAL.muted, display: "inline-flex", alignItems: "center", gap: "5px" }}>
            <span
              aria-hidden="true"
              style={{
                display: "inline-block",
                width: "8px",
                height: "8px",
                borderRadius: "9999px",
                background: CHART_SERIES_COLORS[index % CHART_SERIES_COLORS.length],
              }}
            />
            {DEVICE_LABEL[row.device]} {Math.round((row.views / total) * 100)}%
          </li>
        ))}
      </ul>
    </div>
  );
}
