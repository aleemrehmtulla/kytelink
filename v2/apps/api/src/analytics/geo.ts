const UNKNOWN_COUNTRY = "XX";
const COUNTRY_PATTERN = /^[A-Za-z]{2}$/;

export interface GeoHeaders {
  "cf-ipcountry"?: string | string[];
  "x-vercel-ip-country"?: string | string[];
}

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function resolveCountry(headers: GeoHeaders): string {
  const raw = firstValue(headers["cf-ipcountry"]) ?? firstValue(headers["x-vercel-ip-country"]);
  if (!raw) return UNKNOWN_COUNTRY;
  const normalized = raw.trim().toUpperCase();
  return COUNTRY_PATTERN.test(normalized) ? normalized : UNKNOWN_COUNTRY;
}
