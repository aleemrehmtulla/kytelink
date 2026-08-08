import { z } from "zod";
import { LANDING_ROUTES } from "./landing-routes";
import { EXTRA_RESERVED_USERNAMES } from "./reserved-usernames";

export const USERNAME_MAX_LENGTH = 30;
export const USERNAME_REGEX = /^[a-z0-9_.-]{1,30}$/;

const DOT_EXTENSION_SUFFIXES = [
  ".json", ".xml", ".txt", ".html", ".htm", ".png", ".jpg", ".jpeg", ".gif",
  ".webp", ".svg", ".ico", ".css", ".js", ".map", ".pdf", ".well-known",
];

export function hasUnsafeDotUsage(username: string): boolean {
  if (!username.includes(".")) return false;
  if (username.startsWith(".") || username.endsWith(".")) return true;
  if (username.includes("..")) return true;
  return DOT_EXTENSION_SUFFIXES.some((suffix) => username.endsWith(suffix));
}

export const RESERVED_USERNAMES: ReadonlySet<string> = new Set<string>([
  ...LANDING_ROUTES,
  ...EXTRA_RESERVED_USERNAMES,
]);

export function normalizeUsername(input: string): string {
  return input.trim().toLowerCase();
}

export function isReservedUsername(input: string): boolean {
  return RESERVED_USERNAMES.has(normalizeUsername(input));
}

export type UsernameRejectionReason =
  | "empty"
  | "too_long"
  | "invalid_chars"
  | "reserved"
  | "unsafe_dot";

export type UsernameValidation =
  | { ok: true; username: string }
  | { ok: false; reason: UsernameRejectionReason };

export function validateUsername(input: string): UsernameValidation {
  const username = normalizeUsername(input);
  if (username.length === 0) return { ok: false, reason: "empty" };
  if (username.length > USERNAME_MAX_LENGTH) return { ok: false, reason: "too_long" };
  if (!USERNAME_REGEX.test(username)) return { ok: false, reason: "invalid_chars" };
  if (hasUnsafeDotUsage(username)) return { ok: false, reason: "unsafe_dot" };
  if (RESERVED_USERNAMES.has(username)) return { ok: false, reason: "reserved" };
  return { ok: true, username };
}

export const usernameSchema = z
  .string()
  .transform(normalizeUsername)
  .refine((value) => validateUsername(value).ok, {
    message:
      "Username must be 1-30 chars of a-z 0-9 . _ - , not reserved, and a dot cannot start or " +
      "end it, repeat, or form a file extension",
  });
