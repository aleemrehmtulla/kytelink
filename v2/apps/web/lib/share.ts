import type { SHARE_DOMAINS } from "../consts/brand";

export type ShareDomain = (typeof SHARE_DOMAINS)[number];

export function profileUrl(domain: ShareDomain, username: string): string {
  return `https://${domain}/${username}`;
}

export interface ShareTargets {
  twitter: string;
  whatsapp: string;
  linkedin: string;
  email: string;
}

// Build the outbound share-intent URLs for a profile link. Kept pure so the
// ShareKyteModal and its regression test share one source of truth.
export function buildShareTargets(url: string, displayName: string | null): ShareTargets {
  const who = displayName?.trim() ? displayName.trim() : "this Kytelink";
  const text = `Check out ${who}`;
  const enc = encodeURIComponent;
  return {
    twitter: `https://twitter.com/intent/tweet?text=${enc(text)}&url=${enc(url)}`,
    whatsapp: `https://wa.me/?text=${enc(`${text} ${url}`)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`,
    email: `mailto:?subject=${enc(text)}&body=${enc(`${text}: ${url}`)}`,
  };
}
