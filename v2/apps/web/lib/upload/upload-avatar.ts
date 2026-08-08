import type { AssetKind } from "@kytelink/schemas";
import type { ApiClient } from "../api/client";
import { isMockApi } from "../api/client";

export interface UploadResult {
  url: string;
  lqip: string | null;
}

// Onboarding uploads happen before the kyte exists, so there is no kyteId to
// presign against. Keep the crop local (data URL) until the kyte is created.
const PRE_KYTE_ID = "onboarding";

function readWithProgress(blob: Blob, onProgress: (pct: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    reader.onload = () => {
      onProgress(100);
      resolve(reader.result as string);
    };
    reader.onerror = () => reject(new Error("Read failed"));
    reader.readAsDataURL(blob);
  });
}

function putWithProgress(
  url: string,
  blob: Blob,
  contentType: string,
  onProgress: (pct: number) => void,
  signal?: AbortSignal,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => (xhr.status < 400 ? resolve() : reject(new Error(`Upload failed (${xhr.status})`)));
    xhr.onerror = () => reject(new Error("Upload failed"));
    if (signal) signal.addEventListener("abort", () => xhr.abort());
    xhr.send(blob);
  });
}

export async function uploadAvatar(
  api: ApiClient,
  kyteId: string,
  kind: AssetKind,
  blob: Blob,
  onProgress: (pct: number) => void,
  signal?: AbortSignal,
): Promise<UploadResult> {
  if (isMockApi() || kyteId === PRE_KYTE_ID) {
    const dataUrl = await readWithProgress(blob, onProgress);
    return { url: dataUrl, lqip: null };
  }

  const created = await api.assets.createUploadUrl({
    kyteId,
    kind,
    contentType: "image/webp",
    sizeBytes: blob.size,
  });
  await putWithProgress(created.uploadUrl, blob, "image/webp", onProgress, signal);
  const finalized = await api.assets.finalize({ assetId: created.assetId });
  return { url: finalized.url, lqip: finalized.lqip };
}
