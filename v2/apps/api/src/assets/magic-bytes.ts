export type DetectedImageType = "png" | "jpeg" | "webp" | "gif";

function startsWith(buffer: Uint8Array, bytes: number[], offset = 0): boolean {
  if (buffer.length < offset + bytes.length) return false;
  return bytes.every((byte, i) => buffer[offset + i] === byte);
}

export function detectImageType(buffer: Uint8Array): DetectedImageType | null {
  if (startsWith(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "png";
  if (startsWith(buffer, [0xff, 0xd8, 0xff])) return "jpeg";
  if (startsWith(buffer, [0x47, 0x49, 0x46, 0x38])) return "gif";
  if (
    startsWith(buffer, [0x52, 0x49, 0x46, 0x46]) &&
    startsWith(buffer, [0x57, 0x45, 0x42, 0x50], 8)
  ) {
    return "webp";
  }
  return null;
}

export function assertIsImage(buffer: Uint8Array): DetectedImageType {
  const detected = detectImageType(buffer);
  if (!detected) {
    throw new Error("not a decodable image (magic-byte check failed)");
  }
  return detected;
}
