import { UAParser } from "ua-parser-js";
import type { DeviceType } from "@kytelink/schemas";

export function resolveDeviceType(userAgent: string | undefined): DeviceType {
  if (!userAgent) return "UNKNOWN";
  const { device } = UAParser(userAgent);
  switch (device.type) {
    case "mobile":
      return "MOBILE";
    case "tablet":
      return "TABLET";
    case undefined:
      return "DESKTOP";
    default:
      return "UNKNOWN";
  }
}
