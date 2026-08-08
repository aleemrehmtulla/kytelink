import { useEffect, useState } from "react";
import { LIMIT_OVERRIDE_CEILING } from "@kytelink/schemas";
import { Button } from "./ui/button";
import { Section } from "./ui/section";

export interface LimitEditorField {
  key: string;
  label: string;
  hint?: string;
  defaultValue: number;
  value: number | null;
  min?: number;
  max?: number;
  format?: (value: number) => string;
}

export interface LimitEditorProps {
  fields: LimitEditorField[];
  onSave: (values: Record<string, number | null>) => Promise<void>;
  title?: string;
  description?: string;
}

type ParsedValue = { ok: true; value: number | null } | { ok: false; message: string };

function initialDraft(fields: LimitEditorField[]): Record<string, string> {
  const draft: Record<string, string> = {};
  for (const field of fields) draft[field.key] = field.value === null ? "" : String(field.value);
  return draft;
}

function parseField(field: LimitEditorField, raw: string | undefined): ParsedValue {
  if (raw === undefined || raw.trim() === "") return { ok: true, value: null };
  const parsed = Number(raw);
  const min = field.min ?? 0;
  const max = field.max ?? LIMIT_OVERRIDE_CEILING;
  if (!Number.isInteger(parsed)) return { ok: false, message: "Whole numbers only." };
  if (parsed < min) return { ok: false, message: `Must be ${min} or more.` };
  if (parsed > max) return { ok: false, message: `Must be ${max} or less.` };
  return { ok: true, value: parsed };
}

function describe(field: LimitEditorField, parsed: ParsedValue): string {
  const show = field.format ?? ((value: number) => String(value));
  if (!parsed.ok) return `Using default (${show(field.defaultValue)})`;
  if (parsed.value === null) return `Using default (${show(field.defaultValue)})`;
  return `Overridden to ${show(parsed.value)}`;
}

export function LimitEditor({
  fields,
  onSave,
  title = "Limit overrides",
  description = "Raise or lower this account's ceilings. Blank means the platform default applies.",
}: LimitEditorProps) {
  const [draft, setDraft] = useState<Record<string, string>>(() => initialDraft(fields));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const valuesKey = fields.map((field) => `${field.key}:${field.value ?? ""}`).join("|");
  const [lastValuesKey, setLastValuesKey] = useState(valuesKey);
  if (valuesKey !== lastValuesKey) {
    setLastValuesKey(valuesKey);
    setDraft(initialDraft(fields));
  }

  useEffect(() => {
    if (!saved) return;
    const timer = window.setTimeout(() => setSaved(false), 2000);
    return () => window.clearTimeout(timer);
  }, [saved]);

  const parsedFields = fields.map((field) => {
    const raw = draft[field.key] ?? "";
    const parsed = parseField(field, raw);
    const original = field.value === null ? "" : String(field.value);
    return { field, raw, parsed, dirty: raw.trim() !== original };
  });

  const invalid = parsedFields.some((entry) => !entry.parsed.ok);
  const dirty = parsedFields.some((entry) => entry.dirty);

  function setValue(key: string, next: string) {
    setDraft((prev) => ({ ...prev, [key]: next }));
    setSaveError(false);
  }

  async function handleSave() {
    const values: Record<string, number | null> = {};
    for (const entry of parsedFields) {
      if (!entry.parsed.ok) return;
      values[entry.field.key] = entry.parsed.value;
    }
    setSaving(true);
    setSaveError(false);
    try {
      await onSave(values);
      setSaved(true);
    } catch {
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Section title={title} description={description}>
      <ul className="flex flex-col divide-y divide-hairline">
        {parsedFields.map(({ field, raw, parsed, dirty: fieldDirty }) => {
          const inputId = `limit-${field.key}`;
          const statusId = `${inputId}-status`;
          return (
            <li
              key={field.key}
              className="flex flex-wrap items-start justify-between gap-3 py-3.5 first:pt-0 last:pb-0"
            >
              <div className="min-w-0 max-w-sm">
                <label htmlFor={inputId} className="block text-[13px] font-medium text-ink">
                  {field.label}
                </label>
                {field.hint ? (
                  <p className="mt-0.5 text-[12px] leading-relaxed text-tertiary">{field.hint}</p>
                ) : null}
                <p id={statusId} className="mt-0.5 flex items-center gap-1.5 text-[12px] text-secondary">
                  <span>{describe(field, parsed)}</span>
                  {fieldDirty ? (
                    <span className="inline-flex items-center gap-1 text-accent">
                      <span className="h-1.5 w-1.5 rounded-pill bg-accent" aria-hidden="true" />
                      Unsaved
                    </span>
                  ) : null}
                </p>
                {!parsed.ok ? (
                  <p className="mt-0.5 text-[12px] text-danger">{parsed.message}</p>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <input
                  id={inputId}
                  type="number"
                  inputMode="numeric"
                  min={field.min ?? 0}
                  max={field.max ?? LIMIT_OVERRIDE_CEILING}
                  value={raw}
                  aria-invalid={!parsed.ok}
                  aria-describedby={statusId}
                  placeholder={field.format ? field.format(field.defaultValue) : String(field.defaultValue)}
                  onChange={(event) => setValue(field.key, event.target.value)}
                  className={`h-9 w-24 rounded-input border bg-card px-2.5 text-right text-[13px] tabular-nums text-ink placeholder:text-faint ${
                    parsed.ok ? "border-border" : "border-danger-border"
                  }`}
                />
                <Button
                  size="sm"
                  tone="ghost"
                  disabled={raw.trim() === ""}
                  onClick={() => setValue(field.key, "")}
                >
                  Use default
                </Button>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button tone="primary" size="sm" busy={saving} disabled={!dirty || invalid} onClick={() => void handleSave()}>
          Save limits
        </Button>
        {invalid ? (
          <span className="text-[12px] text-danger">Fix the highlighted fields first.</span>
        ) : dirty ? (
          <span className="text-[12px] text-tertiary">Unsaved changes.</span>
        ) : saved ? (
          <span className="text-[12px] text-success">Saved.</span>
        ) : null}
        {saveError ? (
          <span className="text-[12px] text-danger">Couldn&rsquo;t save. Try again.</span>
        ) : null}
      </div>
    </Section>
  );
}
