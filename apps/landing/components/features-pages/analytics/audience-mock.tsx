import { CountrySplit, DeviceSplit } from "@kytelink/ui";
import { MOCK_COUNTRIES, MOCK_DEVICES } from "../../../lib/mock-analytics";

const DEVICE_LABELS: Record<string, string> = {
  MOBILE: "Mobile",
  DESKTOP: "Desktop",
  TABLET: "Tablet",
};

function DeviceRows() {
  const max = MOCK_DEVICES.reduce((acc, row) => Math.max(acc, row.views), 0) || 1;
  return (
    <ul className="flex flex-col gap-2">
      {MOCK_DEVICES.map((row) => (
        <li key={row.device} className="text-[13px]">
          <div className="flex justify-between gap-3">
            <span>{DEVICE_LABELS[row.device] ?? row.device}</span>
            <span className="font-semibold">{row.views.toLocaleString("en-US")}</span>
          </div>
          <div className="mt-1.5 h-2 rounded-pill bg-tint-hover">
            <div
              className="h-2 rounded-pill bg-accent"
              style={{ width: `${Math.max(2, (row.views / max) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function AudienceMock() {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <div className="rounded-card border border-cardline bg-card p-5 text-ink sm:p-6">
        <h3 className="text-[13px] font-semibold text-ink">Devices</h3>
        <div className="mt-4">
          <DeviceSplit data={MOCK_DEVICES} />
        </div>
        <div className="mt-5">
          <DeviceRows />
        </div>
      </div>
      <div className="rounded-card border border-cardline bg-card p-5 text-ink sm:p-6">
        <h3 className="text-[13px] font-semibold text-ink">Countries</h3>
        <div className="mt-4">
          <CountrySplit data={MOCK_COUNTRIES} />
        </div>
      </div>
    </div>
  );
}
