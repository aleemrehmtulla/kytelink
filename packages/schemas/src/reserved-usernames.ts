// Names that can never be claimed as a kyte username, on top of the live routes
// in LANDING_ROUTES. Grouped by why they are held back, because the reasons have
// different lifetimes: routes change with the product, the rest are permanent.
//
// Deliberately not a general profanity or trademark list — those are moderation
// concerns handled after publish, not claim-time validation.

// Anything that is or could become a hostname in front of the product. Claiming
// these makes kytelink.com/<name> read as infrastructure it is not.
const INFRASTRUCTURE = [
  "www",
  "cdn",
  "assets",
  "static",
  "media",
  "img",
  "images",
  "files",
  "uploads",
  "app",
  "apps",
  "web",
  "api",
  "dev",
  "staging",
  "test",
  "beta",
  "alpha",
  "mail",
  "email",
  "smtp",
  "imap",
  "pop",
  "webmail",
  "ftp",
  "dns",
  "ns",
  "ns1",
  "ns2",
  "mx",
  "localhost",
  "internal",
  "health",
  "status",
  "metrics",
  "dev-login",
] as const;

// The product's own identity.
const BRAND = ["kytelink", "kytelinks", "kyte", "kytes", "official", "team", "staff"] as const;

// Sign-in and account-recovery vocabulary. Kytelink's anti-phishing statement
// names these exact flows as the impersonation pattern that was abused at
// volume, so they stay unclaimable rather than being caught after the fact.
const AUTH_AND_RECOVERY = [
  "login",
  "log-in",
  "signin",
  "sign-in",
  "signup",
  "sign-up",
  "register",
  "logout",
  "signout",
  "auth",
  "oauth",
  "sso",
  "session",
  "password",
  "passwords",
  "passkey",
  "reset",
  "recover",
  "recovery",
  "verify",
  "verification",
  "verified",
  "confirm",
  "confirmation",
  "activate",
  "unlock",
  "secure",
  "security",
  "2fa",
  "mfa",
  "otp",
  "token",
  "credentials",
] as const;

// Support and trust surfaces — the other half of the impersonation pattern.
const SUPPORT_AND_TRUST = [
  "support",
  "help",
  "helpdesk",
  "contact",
  "abuse",
  "report",
  "moderation",
  "moderator",
  "trust",
  "safety",
  "admin",
  "administrator",
  "root",
  "sysadmin",
  "webmaster",
  "postmaster",
  "hostmaster",
  "legal",
  "privacy",
  "terms",
  "dmca",
  "compliance",
] as const;

// Billing vocabulary — the third impersonation surface, and a likely future route.
const BILLING = [
  "billing",
  "payment",
  "payments",
  "pay",
  "invoice",
  "invoices",
  "receipt",
  "refund",
  "refunds",
  "subscribe",
  "subscription",
  "checkout",
  "upgrade",
  "plans",
  "plan",
  "enterprise",
] as const;

// Marketing and docs surfaces the product is likely to want later. Cheaper to
// hold now than to reclaim from someone who already printed the URL.
const PRODUCT_SURFACES = [
  "about",
  "blog",
  "docs",
  "documentation",
  "changelog",
  "roadmap",
  "careers",
  "jobs",
  "press",
  "brand",
  "faq",
  "guide",
  "guides",
  "download",
  "downloads",
  "partners",
  "affiliates",
  "developers",
  "community",
  "events",
  "shop",
  "store",
  "search",
  "explore",
  "discover",
  "settings",
  "profile",
  "profiles",
  "user",
  "users",
  "me",
  "my",
  // Draft previews moved from /preview to /p; the old word stays unclaimable.
  "preview",
] as const;

// Values that routinely leak out of buggy string handling and would otherwise
// become a real, resolvable profile.
const SENTINELS = ["null", "undefined", "nan", "none", "nil", "true", "false", "index"] as const;

export const EXTRA_RESERVED_USERNAMES = [
  ...INFRASTRUCTURE,
  ...BRAND,
  ...AUTH_AND_RECOVERY,
  ...SUPPORT_AND_TRUST,
  ...BILLING,
  ...PRODUCT_SURFACES,
  ...SENTINELS,
] as const;
