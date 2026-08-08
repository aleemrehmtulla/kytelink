import type { StorageFileRow } from "../../../lib/admin-source";

export type FileKind = StorageFileRow["kind"];

export const FILE_KINDS: readonly FileKind[] = ["image", "avatar", "og"];

export const FILE_KIND_LABELS: Record<FileKind, string> = {
  image: "Link image",
  avatar: "Avatar",
  og: "Social preview",
};

export function isFileKind(value: string): value is FileKind {
  return (FILE_KINDS as readonly string[]).includes(value);
}

export type MeterTone = "accent" | "warning" | "danger";

export function meterTone(pctOfLimit: number): MeterTone {
  if (pctOfLimit > 100) return "danger";
  if (pctOfLimit >= 80) return "warning";
  return "accent";
}

export function fileDimensions(width: number | null, height: number | null): string {
  if (width === null || height === null) return "—";
  return `${width}×${height}`;
}
