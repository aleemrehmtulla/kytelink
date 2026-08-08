import { z } from "zod";

export const PREVIEW_EXPIRY_DAYS = 7;
export const PREVIEW_PASSCODE_REGEX = /^\d{6}$/;

/**
 * 12 base64url chars (9 random bytes) — a 4.7e21 keyspace. At 25M live links
 * that is a ~1-in-15-million chance of any collision ever, and a guess lands on
 * a real token once in 1.9e14 tries, which still only reaches the passcode gate.
 * Kept short because the whole URL is meant to be pasted into a DM.
 */
export const PREVIEW_TOKEN_BYTES = 9;
export const PREVIEW_TOKEN_LENGTH = 12;

// The passcode travels in the preview URL's `?p=` when the owner clicks "Open
// preview", so the query key is shared by the editor and the preview page.
export const PREVIEW_PASSCODE_PARAM = "p";

// Deliberately one character: this link gets pasted into DMs.
export const PREVIEW_PATH = "/p";

export const previewPasscodeSchema = z.string().regex(PREVIEW_PASSCODE_REGEX, {
  message: "Passcode must be 6 digits",
});

export const previewVerifyInputSchema = z.object({
  token: z.string().min(1),
  passcode: previewPasscodeSchema,
});

// A kyte has exactly one preview link. Token and passcode are readable by the
// owner forever (the editor re-displays both on every visit), so unlike invite
// tokens they are stored in the clear — rotating the passcode is the revoke.
export const previewLinkSchema = z.object({
  token: z.string().min(1),
  passcode: previewPasscodeSchema,
  url: z.string().min(1),
  expiresAt: z.date(),
});

export type PreviewLink = z.infer<typeof previewLinkSchema>;

export function previewUrl(base: string, token: string): string {
  return `${base.replace(/\/$/, "")}${PREVIEW_PATH}/${token}`;
}

// The owner's own "Open preview" link: the passcode rides along so the gate
// unlocks on arrival instead of asking them for a code they just generated.
export function withPreviewPasscode(url: string, passcode: string): string {
  return `${url}?${PREVIEW_PASSCODE_PARAM}=${passcode}`;
}
