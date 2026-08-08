import { useState } from "react";
import { useIsHydrated } from "./portal";

export interface DateRange {
  from: string;
  to: string;
}

type RangeGranularity = "hour" | "day" | "week";

export interface DateRangePickerProps {
  value: DateRange;
  /**
   * A preset passes its granularity here rather than firing
   * `onGranularityChange` straight after, so the consumer sees one change
   * instead of two racing writes.
   */
  onChange: (next: DateRange, granularity?: RangeGranularity) => void;
  /** Omit both to drop the segmented control — the audit log has no bucketing concept. */
  granularity?: RangeGranularity;
  onGranularityChange?: (next: RangeGranularity) => void;
  maxDays?: number;
}

const DAY_MS = 86_400_000;

type PresetKind = "span";

interface Preset {
  key: string;
  label: string;
  kind: PresetKind;
  spanMs?: number;
  granularity: RangeGranularity;
}

// Four presets cover the shapes people actually ask for; everything else —
// last hour, a calendar month, a quarter — is one click into Custom, which is
// cheaper than eight chips to read past every time.
const PRESETS: Preset[] = [
  { key: "24h", label: "24h", kind: "span", spanMs: DAY_MS, granularity: "hour" },
  { key: "7d", label: "7d", kind: "span", spanMs: 7 * DAY_MS, granularity: "day" },
  { key: "30d", label: "30d", kind: "span", spanMs: 30 * DAY_MS, granularity: "day" },
  { key: "90d", label: "90d", kind: "span", spanMs: 90 * DAY_MS, granularity: "week" },
];

const GRANULARITIES: { value: RangeGranularity; label: string }[] = [
  { value: "hour", label: "Hourly" },
  { value: "day", label: "Daily" },
  { value: "week", label: "Weekly" },
];

const MATCH_TOLERANCE_MS = 90_000;

/** Anchored on an explicit instant so render stays pure — never `new Date()` here. */
function resolvePreset(preset: Preset, anchor: Date): DateRange {
  const span = preset.spanMs ?? DAY_MS;
  return {
    from: new Date(anchor.getTime() - span).toISOString(),
    to: anchor.toISOString(),
  };
}

function presetSpanDays(preset: Preset, anchor: Date): number {
  const range = resolvePreset(preset, anchor);
  return (new Date(range.to).getTime() - new Date(range.from).getTime()) / DAY_MS;
}

function matchesPreset(preset: Preset, value: DateRange, anchor: Date): boolean {
  const candidate = resolvePreset(preset, anchor);
  const fromGap = Math.abs(
    new Date(candidate.from).getTime() - new Date(value.from).getTime(),
  );
  const toGap = Math.abs(new Date(candidate.to).getTime() - new Date(value.to).getTime());
  return fromGap <= MATCH_TOLERANCE_MS && toGap <= MATCH_TOLERANCE_MS;
}

function toLocalInput(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromLocalInput(value: string): string | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

const CHIP = "rounded-pill cursor-pointer border px-3 py-1 text-[12px] font-medium";
const CHIP_ON = "border-accent bg-accent text-white";
const CHIP_OFF = "border-border bg-card text-secondary hover:bg-tint hover:text-ink";
const CHIP_OFF_DISABLED = "border-border bg-card text-faint";

export function DateRangePicker({
  value,
  onChange,
  granularity,
  onGranularityChange,
  maxDays,
}: DateRangePickerProps) {
  const hydrated = useIsHydrated();
  const [customOpen, setCustomOpen] = useState(false);

  const anchor = new Date(value.to);
  const activePreset = PRESETS.find((preset) => matchesPreset(preset, value, anchor));
  const custom = customOpen || !activePreset;
  const spanDays =
    (new Date(value.to).getTime() - new Date(value.from).getTime()) / DAY_MS;
  const overLimit = maxDays !== undefined && spanDays > maxDays + 0.001;

  function applyPreset(preset: Preset) {
    setCustomOpen(false);
    onChange(
      resolvePreset(preset, new Date()),
      onGranularityChange ? preset.granularity : undefined,
    );
  }

  function setBound(bound: "from" | "to", raw: string) {
    const iso = fromLocalInput(raw);
    if (!iso) return;
    onChange(
      bound === "from" ? { from: iso, to: value.to } : { from: value.from, to: iso },
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div
          className="flex flex-wrap items-center gap-1.5"
          role="group"
          aria-label="Date range"
        >
          {PRESETS.map((preset) => {
            const disabled =
              maxDays !== undefined && presetSpanDays(preset, anchor) > maxDays + 0.001;
            const on = !custom && activePreset?.key === preset.key;
            return (
              <button
                key={preset.key}
                type="button"
                disabled={disabled}
                aria-pressed={on}
                onClick={() => applyPreset(preset)}
                className={`${CHIP} ${on ? CHIP_ON : disabled ? CHIP_OFF_DISABLED : CHIP_OFF} disabled:cursor-not-allowed disabled:opacity-50`}
              >
                {preset.label}
              </button>
            );
          })}
          <button
            type="button"
            aria-pressed={custom}
            onClick={() => setCustomOpen((open) => !open)}
            className={`${CHIP} ${custom ? CHIP_ON : CHIP_OFF}`}
          >
            Custom…
          </button>
        </div>

        {granularity !== undefined && onGranularityChange ? (
          <div
            className="border-border bg-card rounded-pill flex items-center gap-0.5 border p-0.5"
            role="group"
            aria-label="Granularity"
          >
            {GRANULARITIES.map((entry) => (
              <button
                key={entry.value}
                type="button"
                aria-pressed={granularity === entry.value}
                onClick={() => onGranularityChange(entry.value)}
                className={`rounded-pill cursor-pointer px-2.5 py-1 text-[12px] font-medium ${
                  granularity === entry.value
                    ? "bg-accent-soft text-accent"
                    : "text-tertiary hover:text-ink"
                }`}
              >
                {entry.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {custom && hydrated ? (
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-tertiary text-[12px] font-medium">From</span>
            <input
              type="datetime-local"
              value={toLocalInput(value.from)}
              max={toLocalInput(value.to)}
              onChange={(event) => setBound("from", event.target.value)}
              className="rounded-input border-border bg-card text-ink cursor-pointer border px-2.5 py-1.5 text-[12px]"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-tertiary text-[12px] font-medium">To</span>
            <input
              type="datetime-local"
              value={toLocalInput(value.to)}
              min={toLocalInput(value.from)}
              onChange={(event) => setBound("to", event.target.value)}
              className="rounded-input border-border bg-card text-ink cursor-pointer border px-2.5 py-1.5 text-[12px]"
            />
          </label>
          {overLimit ? (
            <p className="text-warning text-[12px]">
              This range covers {Math.round(spanDays)} days — the maximum is {maxDays}.
              Narrow it before the data loads.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
