import type { ReactNode } from "react";
import { useState } from "react";
import { Button } from "../../ui/button";
import { copyText } from "../../ui/clipboard";
import { CopyId } from "../../ui/copy-id";
import { Modal } from "../../ui/modal";
import { useToast } from "../../ui/toast";
import { formatBytes, formatDateTimeFull, formatNumber, formatRelativeTime } from "../../../lib/format";
import { ASSET_KIND_LABELS } from "./labels";

export interface ViewableAsset {
  id: string;
  kind: "image" | "avatar" | "og";
  key: string;
  url: string;
  contentType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  createdAt: string;
  uploaderEmail: string | null;
}

export interface AssetViewerProps {
  asset: ViewableAsset | null;
  onClose: () => void;
  /** Extra context rows above the file facts — e.g. the kyte or org it belongs to. */
  context?: { label: string; value: ReactNode }[];
  onDelete?: (asset: ViewableAsset) => void;
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-tertiary shrink-0 text-[12px]">{label}</dt>
      <dd className="text-ink min-w-0 text-right text-[12px] font-medium [font-variant-numeric:tabular-nums]">
        {children}
      </dd>
    </div>
  );
}

/**
 * The asset itself, rendered from the admin proxy — which reads quarantined
 * objects too, so a suspended kyte's files are still inspectable — plus the
 * exact storage key, because "which object in the bucket is this" is the
 * question every storage or moderation escalation ends at.
 */
export function AssetViewer({ asset, onClose, context, onDelete }: AssetViewerProps) {
  const { toast } = useToast();
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const failed = asset !== null && failedUrl === asset.url;

  async function copyKey() {
    if (!asset) return;
    const ok = await copyText(asset.key);
    toast(ok ? "Storage key copied." : "Couldn't copy the storage key.", {
      tone: ok ? "success" : "danger",
    });
  }

  return (
    <Modal
      open={asset !== null}
      onClose={onClose}
      title={asset ? ASSET_KIND_LABELS[asset.kind] : ""}
      size="md"
      footer={
        <>
          {asset && onDelete ? (
            <Button tone="danger" onClick={() => onDelete(asset)}>
              Delete…
            </Button>
          ) : null}
          <Button tone="secondary" onClick={onClose}>
            Close
          </Button>
        </>
      }
    >
      {asset ? (
        <div className="flex flex-col gap-3">
          {/* Fixed height so the modal doesn't grow (and recenter) when the image arrives. */}
          <div className="rounded-card border-hairline bg-tint flex h-[320px] items-center justify-center overflow-hidden border p-3">
            {failed ? (
              <div className="flex flex-col items-center gap-1 py-10 text-center">
                <span className="text-secondary text-[13px] font-medium">
                  Couldn&rsquo;t load this file.
                </span>
                <span className="text-tertiary max-w-[300px] text-[12px] leading-relaxed">
                  The record exists but the object didn&rsquo;t come back — it may have been
                  pruned from storage, or uploads are off in this deployment.
                </span>
              </div>
            ) : (
              <img
                src={asset.url}
                alt={`${ASSET_KIND_LABELS[asset.kind]} — ${asset.key}`}
                onError={() => setFailedUrl(asset.url)}
                className="max-h-full max-w-full object-contain"
              />
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-tertiary text-[11px] font-medium tracking-[0.06em] uppercase">
              Storage key
            </span>
            <button
              type="button"
              onClick={() => void copyKey()}
              title="Copy the exact object key"
              className="rounded-input bg-tint text-secondary hover:bg-tint-hover hover:text-ink cursor-pointer px-3 py-2 text-left font-mono text-[12px] break-all"
            >
              {asset.key}
            </button>
          </div>

          <dl className="rounded-input border-hairline flex flex-col gap-1.5 border p-3">
            {(context ?? []).map((row) => (
              <Fact key={row.label} label={row.label}>
                {row.value}
              </Fact>
            ))}
            <Fact label="Content type">{asset.contentType}</Fact>
            <Fact label="Dimensions">
              {asset.width !== null && asset.height !== null
                ? `${formatNumber(asset.width)} × ${formatNumber(asset.height)}`
                : "—"}
            </Fact>
            <Fact label="Size">{formatBytes(asset.sizeBytes)}</Fact>
            <Fact label="Uploaded by">{asset.uploaderEmail ?? "Unknown"}</Fact>
            <Fact label="Uploaded">
              <span title={formatDateTimeFull(asset.createdAt)}>
                {formatRelativeTime(asset.createdAt)}
              </span>
            </Fact>
            <Fact label="Asset ID">
              <CopyId value={asset.id} label="Asset ID" />
            </Fact>
          </dl>
        </div>
      ) : null}
    </Modal>
  );
}
