const APP_ERROR_CODES = [
  "LIMIT_REACHED",
  "FEATURE_DISABLED",
  "KYTE_SUSPENDED",
  "ACCOUNT_SUSPENDED",
  "STALE_DRAFT",
  "NOT_IMPLEMENTED",
] as const;

// The API's messages for these carry a bare "/appeal" path, which reads as a
// dead link in a toast — say it in the product's own words instead.
export const APP_ERROR_MESSAGES: Partial<Record<AppErrorCode, string>> = {
  ACCOUNT_SUSPENDED: "Your account is suspended, so it's read-only. Appeal to get it back.",
  KYTE_SUSPENDED: "This page is suspended, so it's read-only until it's reviewed.",
};

export type AppErrorCode = (typeof APP_ERROR_CODES)[number];

export class ApiClientError extends Error {
  readonly appCode: AppErrorCode | null;
  readonly detail: string | null;

  constructor(message: string, appCode: AppErrorCode | null = null, detail: string | null = null) {
    super(message);
    this.name = "ApiClientError";
    this.appCode = appCode;
    this.detail = detail;
  }
}

export function isAppCode(value: unknown): value is AppErrorCode {
  return typeof value === "string" && (APP_ERROR_CODES as readonly string[]).includes(value);
}

export function appCodeOfError(error: unknown): AppErrorCode | null {
  if (error instanceof ApiClientError) return error.appCode;
  return null;
}
