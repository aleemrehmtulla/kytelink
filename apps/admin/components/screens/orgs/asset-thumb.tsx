import { useState } from "react";
import { ASSET_KIND_LABELS } from "./labels";

export interface AssetThumbProps {
  url: string;
  kind: "image" | "avatar" | "og";
}

/** Tiny inline preview for file rows; falls back to a quiet tile when the
 * object is gone so a missing file never renders as a broken-image glyph. */
export function AssetThumb({ url, kind }: AssetThumbProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span
        aria-hidden="true"
        className="rounded-input border-hairline bg-tint text-faint flex h-8 w-8 shrink-0 items-center justify-center border text-[10px]"
      >
        —
      </span>
    );
  }

  return (
    <img
      src={url}
      alt={ASSET_KIND_LABELS[kind]}
      loading="lazy"
      onError={() => setFailed(true)}
      className="rounded-input border-hairline bg-tint h-8 w-8 shrink-0 border object-cover"
    />
  );
}
