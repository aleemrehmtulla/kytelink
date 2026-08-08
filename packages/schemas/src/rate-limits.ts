// "ip+kyte" is a composite subject: the beacon-per-kyte cap is per visitor
// (ip_hash) per kyte, NOT a global cap on a kyte's views (doc 06).
export const RATE_LIMIT_SUBJECTS = [
  "ip",
  "email",
  "user",
  "org",
  "kyte",
  "ip+kyte",
  "global",
] as const;
export type RateLimitSubject = (typeof RATE_LIMIT_SUBJECTS)[number];

const MINUTE = 60;
const QUARTER_HOUR = 15 * 60;
const HOUR = 60 * 60;
const DAY = 24 * 60 * 60;

export type RateLimitRule = {
  limit: number;
  windowSec: number;
  subject: RateLimitSubject;
};

// Deliberately liberal: these exist to stop runaway scripts, not to meter
// humans — no real person should ever hit one. Only the two code-guessing
// gates (otp-verify, preview-verify) stay tight enough to keep brute force
// infeasible. In dev/agent mode all traffic shares one IP.
export const RATE_LIMIT_CLASSES = {
  beacon: [{ limit: 3750, windowSec: MINUTE, subject: "ip" }],
  "beacon-per-kyte": [{ limit: 750, windowSec: MINUTE, subject: "ip+kyte" }],
  "otp-send": [
    { limit: 15, windowSec: QUARTER_HOUR, subject: "email" },
    { limit: 150, windowSec: HOUR, subject: "ip" },
  ],
  "otp-verify": [{ limit: 15, windowSec: QUARTER_HOUR, subject: "email" }],
  oauth: [{ limit: 750, windowSec: HOUR, subject: "ip" }],
  "trpc-read": [{ limit: 3750, windowSec: MINUTE, subject: "user" }],
  "trpc-write": [{ limit: 1500, windowSec: MINUTE, subject: "user" }],
  "username-check": [{ limit: 450, windowSec: MINUTE, subject: "user" }],
  "upload-url": [{ limit: 750, windowSec: HOUR, subject: "user" }],
  "invite-send": [
    { limit: 225, windowSec: DAY, subject: "user" },
    { limit: 750, windowSec: DAY, subject: "org" },
  ],
  "kyte-create": [{ limit: 75, windowSec: DAY, subject: "user" }],
  "preview-rotate": [{ limit: 150, windowSec: DAY, subject: "user" }],
  "preview-verify": [{ limit: 45, windowSec: QUARTER_HOUR, subject: "ip" }],
  import: [{ limit: 75, windowSec: DAY, subject: "user" }],
  "username-change": [{ limit: 40, windowSec: DAY, subject: "user" }],
  "domain-add": [{ limit: 75, windowSec: DAY, subject: "user" }],
  // Caddy's on-demand TLS `ask` gate. Generous because a busy self-hosted
  // instance calls it on every first-hit for an uncached host, but bounded so
  // the unauthenticated endpoint cannot be used to hammer the domain lookup.
  "domain-allowed": [{ limit: 3750, windowSec: QUARTER_HOUR, subject: "ip" }],
  report: [{ limit: 150, windowSec: DAY, subject: "ip" }],
  appeal: [{ limit: 40, windowSec: DAY, subject: "ip" }],
} satisfies Record<string, readonly RateLimitRule[]>;

export type RateLimitClass = keyof typeof RATE_LIMIT_CLASSES;
