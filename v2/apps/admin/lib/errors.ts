import { TRPCClientError } from "@trpc/client";

/**
 * Signed-out and not-an-admin both surface as an `adminProcedure` rejection, and
 * both mean "show the gate", not "retry".
 */
export function isUnauthorizedError(error: unknown): boolean {
  if (!(error instanceof TRPCClientError)) return false;
  const data: unknown = error.data;
  if (typeof data !== "object" || data === null) return false;
  const shape = data as { code?: unknown; httpStatus?: unknown };
  if (shape.code === "UNAUTHORIZED" || shape.code === "FORBIDDEN") return true;
  return shape.httpStatus === 401 || shape.httpStatus === 403;
}
