import { TRPCError, type TRPC_ERROR_CODE_KEY } from "@trpc/server";
import { APPEAL_PATH } from "@kytelink/schemas";

export const APP_ERROR_CODES = [
  "LIMIT_REACHED",
  "FEATURE_DISABLED",
  "KYTE_SUSPENDED",
  "ACCOUNT_SUSPENDED",
  "STALE_DRAFT",
  "NOT_IMPLEMENTED",
] as const;

export type AppErrorCode = (typeof APP_ERROR_CODES)[number];

const APP_ERROR_TRPC_CODE: Record<AppErrorCode, TRPC_ERROR_CODE_KEY> = {
  LIMIT_REACHED: "FORBIDDEN",
  FEATURE_DISABLED: "PRECONDITION_FAILED",
  KYTE_SUSPENDED: "FORBIDDEN",
  ACCOUNT_SUSPENDED: "FORBIDDEN",
  STALE_DRAFT: "CONFLICT",
  NOT_IMPLEMENTED: "NOT_IMPLEMENTED",
};

const APP_ERROR_DEFAULT_MESSAGE: Record<AppErrorCode, string> = {
  LIMIT_REACHED: "This organization has reached a plan limit.",
  FEATURE_DISABLED: "This feature is disabled on this deployment.",
  KYTE_SUSPENDED:
    "This kyte is suspended and is read-only. You can appeal at " + APPEAL_PATH + ".",
  ACCOUNT_SUSPENDED:
    "Your account is suspended, so it is read-only. You can appeal at " + APPEAL_PATH + ".",
  STALE_DRAFT: "The draft changed since you last loaded it.",
  NOT_IMPLEMENTED: "This procedure is not implemented yet.",
};

export class AppError extends TRPCError {
  readonly appCode: AppErrorCode;

  constructor(appCode: AppErrorCode, message?: string) {
    super({
      code: APP_ERROR_TRPC_CODE[appCode],
      message: message ?? APP_ERROR_DEFAULT_MESSAGE[appCode],
    });
    this.appCode = appCode;
    this.name = "AppError";
  }
}

export function limitReached(message?: string): AppError {
  return new AppError("LIMIT_REACHED", message);
}

export function featureDisabled(message?: string): AppError {
  return new AppError("FEATURE_DISABLED", message);
}

export function kyteSuspended(message?: string): AppError {
  return new AppError("KYTE_SUSPENDED", message);
}

export function accountSuspended(message?: string): AppError {
  return new AppError("ACCOUNT_SUSPENDED", message);
}

export function staleDraft(message?: string): AppError {
  return new AppError("STALE_DRAFT", message);
}

export function notImplemented(procedure?: string): AppError {
  return new AppError(
    "NOT_IMPLEMENTED",
    procedure ? `${procedure} is not implemented yet.` : undefined,
  );
}

export function appCodeOf(error: unknown): AppErrorCode | undefined {
  if (error instanceof AppError) return error.appCode;
  if (error instanceof TRPCError && error.cause instanceof AppError) {
    return error.cause.appCode;
  }
  return undefined;
}
