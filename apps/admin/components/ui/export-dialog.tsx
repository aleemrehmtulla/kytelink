import { useEffect, useRef, useState } from "react";
import type { ExportCell, ExportDataset, ExportRowsOutput } from "../../lib/admin-source";
import { formatCount, formatNumber } from "../../lib/format";
import { useAdminSource } from "../../hooks/use-admin-source";
import { Button } from "./button";
import { Modal } from "./modal";
import { copyText } from "./clipboard";
import { useToast } from "./toast";

export type ExportFormat = "csv" | "json" | "md";

export interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  dataset: ExportDataset;
  filters: Record<string, unknown>;
  title: string;
  scopeDescription: string;
}

const FORMATS: { value: ExportFormat; label: string; extension: string }[] = [
  { value: "csv", label: "CSV", extension: "csv" },
  { value: "json", label: "JSON", extension: "json" },
  { value: "md", label: "Markdown table", extension: "md" },
];

const LIMITS = [100, 1000, 5000] as const;
const PREVIEW_ROWS = 8;
const BOM = "\uFEFF";

const MIME: Record<ExportFormat, string> = {
  csv: "text/csv;charset=utf-8",
  json: "application/json;charset=utf-8",
  md: "text/markdown;charset=utf-8",
};

function cellToText(cell: ExportCell | undefined): string {
  if (cell === null || cell === undefined) return "";
  if (typeof cell === "boolean") return cell ? "true" : "false";
  return String(cell);
}

function csvField(value: string): string {
  if (/[",\r\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function toCsv(data: ExportRowsOutput): string {
  const header = data.columns.map((column) => csvField(column.label)).join(",");
  const body = data.rows.map((row) =>
    data.columns.map((column) => csvField(cellToText(row[column.key]))).join(","),
  );
  return `${BOM}${[header, ...body].join("\r\n")}\r\n`;
}

function toJson(data: ExportRowsOutput): string {
  return `${JSON.stringify(
    {
      dataset: data.dataset,
      generatedAt: data.generatedAt,
      total: data.total,
      truncated: data.truncated,
      rows: data.rows,
    },
    null,
    2,
  )}\n`;
}

function markdownCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

function toMarkdown(data: ExportRowsOutput): string {
  const header = `| ${data.columns.map((column) => markdownCell(column.label)).join(" | ")} |`;
  const rule = `| ${data.columns.map(() => "---").join(" | ")} |`;
  const body = data.rows.map(
    (row) =>
      `| ${data.columns.map((column) => markdownCell(cellToText(row[column.key]))).join(" | ")} |`,
  );
  return `${[header, rule, ...body].join("\n")}\n`;
}

function serialize(data: ExportRowsOutput, format: ExportFormat): string {
  if (format === "csv") return toCsv(data);
  if (format === "json") return toJson(data);
  return toMarkdown(data);
}

function fileName(dataset: string, format: ExportFormat): string {
  const extension = FORMATS.find((entry) => entry.value === format)?.extension ?? "txt";
  const today = new Date().toISOString().slice(0, 10);
  return `kytelink-${dataset}-${today}.${extension}`;
}

const CHIP = "rounded-pill cursor-pointer border px-3 py-1 text-[12px] font-medium";
const CHIP_ON = "border-accent bg-accent text-white";
const CHIP_OFF = "border-border bg-card text-secondary hover:bg-tint hover:text-ink";

export function ExportDialog({
  open,
  onClose,
  dataset,
  filters,
  title,
  scopeDescription,
}: ExportDialogProps) {
  const source = useAdminSource();
  const { toast } = useToast();
  const [format, setFormat] = useState<ExportFormat>("csv");
  const [limit, setLimit] = useState<number>(1000);
  const [settled, setSettled] = useState<{
    key: string;
    data: ExportRowsOutput | null;
    failed: boolean;
  } | null>(null);

  const filtersKey = JSON.stringify(filters);
  const requestKey = `${dataset}|${limit}|${filtersKey}`;
  const attemptRef = useRef(0);
  const sourceRef = useRef(source);
  const filtersRef = useRef(filters);

  useEffect(() => {
    sourceRef.current = source;
    filtersRef.current = filters;
  });

  useEffect(() => {
    if (!open) return;
    attemptRef.current += 1;
    const attempt = attemptRef.current;
    sourceRef.current
      .exportRows({ dataset, filters: filtersRef.current, limit })
      .then((result) => {
        if (attemptRef.current !== attempt) return;
        setSettled({ key: requestKey, data: result, failed: false });
      })
      .catch(() => {
        if (attemptRef.current !== attempt) return;
        setSettled({ key: requestKey, data: null, failed: true });
      });
  }, [open, dataset, limit, requestKey]);

  const loading = open && settled?.key !== requestKey;
  const failed = settled?.key === requestKey && settled.failed;
  const data = failed ? null : (settled?.data ?? null);

  const text = data ? serialize(data, format) : "";
  const preview = data
    ? serialize({ ...data, rows: data.rows.slice(0, PREVIEW_ROWS) }, format).replace(
        BOM,
        "",
      )
    : "";

  async function copy() {
    if (!text) return;
    const ok = await copyText(text);
    toast(
      ok
        ? `Copied ${formatCount(data?.rows.length ?? 0, "row")} to the clipboard`
        : "Couldn't reach the clipboard — use Download instead",
      { tone: ok ? "success" : "danger" },
    );
  }

  function download() {
    if (!text || !data) return;
    const blob = new Blob([text], { type: MIME[format] });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName(data.dataset, format);
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
    toast(`Downloaded ${fileName(data.dataset, format)}`);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={scopeDescription}
      size="lg"
      footer={
        <>
          <Button tone="secondary" onClick={onClose}>
            Close
          </Button>
          <Button
            tone="secondary"
            onClick={download}
            disabled={!data || data.rows.length === 0}
          >
            Download
          </Button>
          <Button
            tone="primary"
            onClick={() => void copy()}
            disabled={!data || data.rows.length === 0}
            busy={loading}
          >
            Copy to clipboard
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <fieldset className="min-w-0">
            <legend className="text-tertiary mb-1.5 text-[12px] font-medium">
              Format
            </legend>
            <div className="flex flex-wrap gap-1.5">
              {FORMATS.map((entry) => (
                <button
                  key={entry.value}
                  type="button"
                  aria-pressed={format === entry.value}
                  onClick={() => setFormat(entry.value)}
                  className={`${CHIP} ${format === entry.value ? CHIP_ON : CHIP_OFF}`}
                >
                  {entry.label}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset className="min-w-0">
            <legend className="text-tertiary mb-1.5 text-[12px] font-medium">
              Row cap
            </legend>
            <div className="flex flex-wrap gap-1.5">
              {LIMITS.map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={limit === value}
                  onClick={() => setLimit(value)}
                  className={`${CHIP} [font-variant-numeric:tabular-nums] ${limit === value ? CHIP_ON : CHIP_OFF}`}
                >
                  {formatNumber(value)}
                </button>
              ))}
            </div>
          </fieldset>
        </div>

        {failed ? (
          <p className="rounded-input border-danger-border bg-danger-soft text-danger border px-3 py-2 text-[12px]">
            Couldn&apos;t build this export. Try a smaller row cap.
          </p>
        ) : null}

        {data ? (
          <>
            <div className="flex flex-col gap-1.5">
              <span className="text-tertiary text-[12px] font-medium">
                {data.columns.length === 1 ? "Column" : `${data.columns.length} columns`}
              </span>
              <p className="text-secondary text-[12px] leading-relaxed">
                {data.columns.map((column) => column.label).join(" · ")}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="text-secondary text-[12px] [font-variant-numeric:tabular-nums]">
                {formatCount(data.rows.length, "row")} of {formatNumber(data.total)}{" "}
                matching
              </span>
              {data.truncated ? (
                <span className="rounded-pill bg-warning-soft text-warning px-2.5 py-0.5 text-[12px] font-medium">
                  Truncated at the {formatNumber(limit)}-row cap — raise the cap or narrow
                  your filters
                </span>
              ) : null}
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-tertiary text-[12px] font-medium">
                Preview — first {Math.min(PREVIEW_ROWS, data.rows.length)} rows
              </span>
              <pre className="rounded-input border-hairline bg-tint text-secondary max-h-56 overflow-auto border p-3 font-mono text-[11px] leading-relaxed">
                {preview || "(no rows)"}
              </pre>
            </div>
          </>
        ) : loading ? (
          <p className="text-tertiary text-[12px]">Building the export…</p>
        ) : null}
      </div>
    </Modal>
  );
}
