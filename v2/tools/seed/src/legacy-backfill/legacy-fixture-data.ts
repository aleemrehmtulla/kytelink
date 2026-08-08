export const IMAGEDELIVERY_PFP = "https://imagedelivery.net/abc123/avatar-1/public";
export const SUPABASE_PFP = "https://xyzproject.supabase.co/storage/v1/object/public/pfps/two.jpg";
export const CLOUDFRONT_PFP = "https://d1fdloi71mui9q.cloudfront.net/legacy/three.png";
export const DEAD_IBB_PFP = "https://i.ibb.co/deadlink/four.png";
export const DEAD_IBB_LINK_IMAGE = "https://i.ibb.co/gone/logo.png";
export const IMAGEDELIVERY_PFP_V2 = "https://imagedelivery.net/abc123/avatar-github-v2/public";
export const DELTA_EDITED_USER_IDS = ["u_google_full", "u_github_full"] as const;

export const FIXTURE_ADMIN_EMAIL = "founder@kytelink.com";

export type LegacyUserRow = {
  id: string;
  name: string | null;
  email: string | null;
  emailVerified: string | null;
  image: string | null;
  legacy: boolean;
  setup: boolean;
};

export type LegacyAccountRow = {
  id: string;
  userId: string;
  type: string;
  provider: string;
  providerAccountId: string;
  refresh_token: string | null;
  access_token: string | null;
  expires_at: number | null;
  token_type: string | null;
  scope: string | null;
  id_token: string | null;
  session_state: string | null;
};

export type LegacyKyteRow = {
  userId: string;
  email: string | null;
  createdAt: string;
  username: string | null;
  banned: boolean | null;
  name: string | null;
  description: string | null;
  pfp: string | null;
  theme: string | null;
  customFont: string | null;
  customColor: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  links: unknown;
  icons: unknown;
  vcf: unknown;
  redirectLink: string | null;
  shouldRedirect: boolean | null;
  blurpfp: string | null;
};

export type LegacyDomainRow = { domain: string; userId: string; createdAt: string };
export type LegacySessionRow = { id: string; sessionToken: string; userId: string; expires: string };
export type LegacyVerificationTokenRow = { identifier: string; token: string; expires: string };
export type LegacyHitRow = {
  id: string;
  kyteId: string;
  timestamp: string;
  referrer: string | null;
  country: string | null;
  ip: string | null;
  device: string | null;
  linkTitle?: string | null;
  linkURL?: string | null;
};

export type LegacyFixture = {
  users: LegacyUserRow[];
  accounts: LegacyAccountRow[];
  drafts: LegacyKyteRow[];
  prods: LegacyKyteRow[];
  domains: LegacyDomainRow[];
  sessions: LegacySessionRow[];
  verificationTokens: LegacyVerificationTokenRow[];
  pageHits: LegacyHitRow[];
  linkHits: LegacyHitRow[];
};

const T0 = "2023-01-15T10:00:00.000Z";
const T1 = "2023-06-20T10:00:00.000Z";
const T2 = "2024-02-01T10:00:00.000Z";

function oauth(
  id: string,
  userId: string,
  provider: string,
  providerAccountId: string,
): LegacyAccountRow {
  return {
    id,
    userId,
    type: "oauth",
    provider,
    providerAccountId,
    refresh_token: `${provider}-refresh-${userId}`,
    access_token: `${provider}-access-${userId}`,
    expires_at: 1_800_000_000,
    token_type: "bearer",
    scope: provider === "google" ? "openid email profile" : "read:user user:email",
    id_token: provider === "google" ? `id-token-${userId}` : null,
    session_state: null,
  };
}

function kyte(row: Partial<LegacyKyteRow> & { userId: string }): LegacyKyteRow {
  return {
    email: null,
    createdAt: T1,
    username: null,
    banned: false,
    name: null,
    description: null,
    pfp: null,
    theme: "default",
    customFont: "default",
    customColor: "default",
    seoTitle: null,
    seoDescription: null,
    links: [],
    icons: [],
    vcf: null,
    redirectLink: null,
    shouldRedirect: false,
    blurpfp: null,
    ...row,
  };
}

const POLY_LINKS = [
  { title: "GitHub", link: "https://github.com/aleem", emoji: "FaGithub", color: "transparent" },
  { title: "Headshot", link: "https://example.com/me", emoji: IMAGEDELIVERY_PFP, color: "transparent" },
  { title: "Wave", link: "https://example.com/wave", emoji: "👋", color: "transparent" },
  { title: "Plain", link: "https://example.com/plain" },
];

const CONTACT_ICONS = [
  { name: "Twitter", url: "https://twitter.com/aleem" },
  { name: "Github", url: "https://github.com/aleem" },
  { name: "Contact", url: null },
];

const users: LegacyUserRow[] = [];
const accounts: LegacyAccountRow[] = [];
const drafts: LegacyKyteRow[] = [];
const prods: LegacyKyteRow[] = [];
const domains: LegacyDomainRow[] = [];

function user(row: Partial<LegacyUserRow> & { id: string }): void {
  users.push({
    name: null,
    email: `${row.id}@legacy.test`,
    emailVerified: T0,
    image: null,
    legacy: false,
    setup: true,
    ...row,
  });
}

function published(row: Partial<LegacyKyteRow> & { userId: string }): void {
  drafts.push(kyte(row));
  prods.push(kyte(row));
}

user({ id: "u_google_full", name: "Google Full", image: IMAGEDELIVERY_PFP });
accounts.push(oauth("acc_google_full", "u_google_full", "google", "google-uid-1"));
published({
  userId: "u_google_full",
  username: "googlefull",
  name: "Google Full",
  description: "All three emoji kinds and a Contact icon.",
  pfp: IMAGEDELIVERY_PFP,
  blurpfp: "data:image/jpeg;base64,tiny",
  theme: "dark",
  links: POLY_LINKS,
  icons: CONTACT_ICONS,
});

user({ id: "u_github_full", name: "Github Full", legacy: false });
accounts.push(oauth("acc_github_full", "u_github_full", "github", "github-uid-1"));
published({
  userId: "u_github_full",
  username: "githubfull",
  name: "Github Full",
  description: "Supabase avatar.",
  pfp: SUPABASE_PFP,
  theme: "froggy",
  links: [POLY_LINKS[0], POLY_LINKS[2]],
  icons: [CONTACT_ICONS[1]],
});

user({ id: "u_both_providers", name: "Both Providers" });
accounts.push(oauth("acc_both_g", "u_both_providers", "google", "google-uid-2"));
accounts.push(oauth("acc_both_gh", "u_both_providers", "github", "github-uid-2"));
published({
  userId: "u_both_providers",
  username: "bothproviders",
  name: "Both Providers",
  description: "Same-email auto-linked Google + GitHub.",
  pfp: CLOUDFRONT_PFP,
  theme: "gradientpink",
  links: [POLY_LINKS[2]],
  icons: [CONTACT_ICONS[0]],
});

user({ id: "u_magiclink", name: "Magic Link Era", legacy: true });
published({
  userId: "u_magiclink",
  username: "magiclink",
  name: "Magic Link Era",
  description: "No OAuth accounts; dead i.ibb.co avatar.",
  pfp: DEAD_IBB_PFP,
  theme: "lavender",
  links: [POLY_LINKS[0]],
});

user({ id: "u_redirect", name: "Redirector" });
accounts.push(oauth("acc_redirect", "u_redirect", "google", "google-uid-3"));
published({
  userId: "u_redirect",
  username: "redirector",
  name: "Redirector",
  theme: "spacegray",
  redirectLink: "example.com/elsewhere",
  shouldRedirect: true,
});

user({ id: "u_banned", name: "Banned Spammer" });
accounts.push(oauth("acc_banned", "u_banned", "github", "github-uid-3"));
published({
  userId: "u_banned",
  username: "bannedspammer",
  name: "Banned Spammer",
  description: "Should map to moderationStatus SUSPENDED.",
  pfp: SUPABASE_PFP,
  theme: "popsicle",
  banned: true,
  links: [POLY_LINKS[0]],
});

user({ id: "u_long", name: "L".repeat(100) });
accounts.push(oauth("acc_long", "u_long", "google", "google-uid-4"));
published({
  userId: "u_long",
  username: "longcontent",
  name: "L".repeat(100),
  description: "D".repeat(300),
  seoTitle: "T".repeat(100),
  seoDescription: "S".repeat(300),
  theme: "default",
  links: Array.from({ length: 12 }, (_, i) => ({
    title: `Link ${i + 1} ${"x".repeat(90)}`.slice(0, 100),
    link: `https://example.com/very/long/path/${i}/${"a".repeat(50)}`,
    emoji: i % 3 === 0 ? "FaTwitter" : i % 3 === 1 ? "🔗" : "transparent",
    color: "transparent",
  })),
});

user({ id: "u_draft_only", name: "Draft Only", legacy: true });
accounts.push(oauth("acc_draft_only", "u_draft_only", "google", "google-uid-5"));
drafts.push(
  kyte({
    userId: "u_draft_only",
    username: "draftonly",
    name: "Draft Only",
    description: "Never published — no KyteProd row.",
    theme: "dark",
    links: [POLY_LINKS[2]],
  }),
);

user({ id: "u_null_username", name: "No Username" });
accounts.push(oauth("acc_null_username", "u_null_username", "github", "github-uid-6"));
published({
  userId: "u_null_username",
  username: null,
  name: "No Username",
  description: "Published but username is null (incomplete onboarding).",
  theme: "default",
});

user({ id: "u_null_name", name: null });
accounts.push(oauth("acc_null_name", "u_null_name", "google", "google-uid-7"));
published({
  userId: "u_null_name",
  username: "nomad",
  name: null,
  description: "User.name null — org name falls back to username.",
  theme: "gradientblue",
});

user({ id: "u_null_name_username", name: null, email: "fallbacklocal@legacy.test" });
drafts.push(
  kyte({
    userId: "u_null_name_username",
    username: null,
    name: null,
    description: "name+username null — org name falls back to email local-part.",
    theme: "default",
  }),
);

user({ id: "u_case_a", name: "Case A", email: "casea@legacy.test" });
published({
  userId: "u_case_a",
  createdAt: T0,
  username: "CoolPerson",
  name: "Case A",
  theme: "default",
});

user({ id: "u_case_b", name: "Case B", email: "caseb@legacy.test" });
published({
  userId: "u_case_b",
  createdAt: T2,
  username: "coolperson",
  name: "Case B",
  theme: "dark",
});

user({ id: "u_reserved", name: "Reserved Name" });
published({
  userId: "u_reserved",
  username: "admin",
  name: "Reserved Name",
  description: "Username is reserved — must be nulled and reported.",
  theme: "default",
});

user({ id: "u_badlink", name: "Bad Link" });
published({
  userId: "u_badlink",
  username: "badlink",
  name: "Bad Link",
  description: "One hard-fail link, one link with a dead legacy field.",
  theme: "gradientblue",
  links: [
    { title: "", link: "javascript:alert(1)", emoji: "FaTwitter" },
    { title: "Legacy Value", link: "https://example.com/ok", emoji: "🔗", value: "dead-tlink-value" },
    { title: "Good", link: "https://example.com/good", emoji: "FaGithub" },
  ],
});

user({ id: "u_bad_theme", name: "Bad Theme" });
published({
  userId: "u_bad_theme",
  username: "badtheme",
  name: "Bad Theme",
  description: "Unknown theme/font/color coerced to safe defaults.",
  theme: "neon-unknown",
  customFont: "comic",
  customColor: "blue.999",
});

user({ id: "u_admin", name: "Founder", email: FIXTURE_ADMIN_EMAIL });
accounts.push(oauth("acc_admin", "u_admin", "google", "google-uid-8"));
published({
  userId: "u_admin",
  username: "founder",
  name: "Founder",
  email: FIXTURE_ADMIN_EMAIL,
  description: "Email in ADMIN_EMAILS — platform role must be ADMIN.",
  theme: "default",
});

user({ id: "u_null_email", name: "No Email", email: null });
drafts.push(
  kyte({
    userId: "u_null_email",
    username: "noemail",
    name: "No Email",
    description: "Null email — cannot satisfy new unique email; quarantined.",
    theme: "default",
  }),
);

user({ id: "u_vcf", name: "Vcf Holder" });
accounts.push(oauth("acc_vcf", "u_vcf", "github", "github-uid-9"));
published({
  userId: "u_vcf",
  username: "vcfholder",
  name: "Vcf Holder",
  description: "Populated vcf — deliberately dropped.",
  theme: "gradientgreen",
  vcf: {
    firstName: "Vcf",
    lastName: "Holder",
    birthday: "1990-01-01",
    email: "vcf@legacy.test",
    phone: "+15551234567",
    company: "Legacy Co",
    note: "must not survive migration",
  },
  links: [POLY_LINKS[0]],
});

user({ id: "u_emoji_poly", name: "Emoji Poly" });
accounts.push(oauth("acc_emoji_poly", "u_emoji_poly", "google", "google-uid-10"));
published({
  userId: "u_emoji_poly",
  username: "emojipoly",
  name: "Emoji Poly",
  description: "Every link-prefix kind incl. a dead link image.",
  pfp: IMAGEDELIVERY_PFP,
  theme: "paper",
  links: [
    { title: "Icon", link: "https://example.com/a", emoji: "FaTiktok", color: "transparent" },
    { title: "Live Image", link: "https://example.com/b", emoji: CLOUDFRONT_PFP, color: "transparent" },
    { title: "Dead Image", link: "https://example.com/c", emoji: DEAD_IBB_LINK_IMAGE, color: "transparent" },
    { title: "Raw Emoji", link: "https://example.com/d", emoji: "🚀", color: "#F56565" },
    { title: "No Prefix", link: "https://example.com/e" },
  ],
  icons: CONTACT_ICONS,
});

user({ id: "u_email_dupe_a", name: "Dupe A", email: "Casey@Example.com" });
published({
  userId: "u_email_dupe_a",
  createdAt: T0,
  username: "dupea",
  name: "Dupe A",
  theme: "default",
});

user({ id: "u_email_dupe_b", name: "Dupe B", email: "casey@example.com" });
published({
  userId: "u_email_dupe_b",
  createdAt: T2,
  username: "dupeb",
  name: "Dupe B",
  description: "Email collides with Dupe A after lowercasing — quarantined.",
  theme: "dark",
});

user({ id: "u_prod_only", name: "Prod Only" });
accounts.push(oauth("acc_prod_only", "u_prod_only", "github", "github-uid-11"));
prods.push(
  kyte({
    userId: "u_prod_only",
    username: "prodonly",
    name: "Prod Only",
    description: "Has KyteProd but no KyteDraft — identity + rewrite must still apply.",
    pfp: IMAGEDELIVERY_PFP,
    theme: "dark",
    links: [
      { title: "Live Image", link: "https://example.com/prodonly", emoji: CLOUDFRONT_PFP, color: "transparent" },
    ],
  }),
);

user({ id: "u_custom_valid", name: "Custom Valid" });
accounts.push(oauth("acc_custom_valid", "u_custom_valid", "google", "google-uid-12"));
published({
  userId: "u_custom_valid",
  username: "customvalid",
  name: "Custom Valid",
  description: "Valid custom font + color must be preserved verbatim (no coercion).",
  theme: "dark",
  customFont: "serif",
  customColor: "purple.400",
});

domains.push({ domain: "GoogleFull.com", userId: "u_google_full", createdAt: T1 });
domains.push({ domain: "links.githubfull.io", userId: "u_github_full", createdAt: T1 });
domains.push({ domain: "founder.example", userId: "u_admin", createdAt: T2 });

const sessions: LegacySessionRow[] = [
  { id: "sess_1", sessionToken: "token-1", userId: "u_google_full", expires: "2025-01-01T00:00:00.000Z" },
  { id: "sess_2", sessionToken: "token-2", userId: "u_github_full", expires: "2025-01-01T00:00:00.000Z" },
];

const verificationTokens: LegacyVerificationTokenRow[] = [
  { identifier: "u_magiclink@legacy.test", token: "verif-token-1", expires: "2025-01-01T00:00:00.000Z" },
];

const pageHits: LegacyHitRow[] = [
  { id: "hp_1", kyteId: "u_google_full", timestamp: T2, referrer: "https://t.co", country: null, ip: "1.2.3.4", device: "MOBILE" },
  { id: "hp_2", kyteId: "u_banned", timestamp: T2, referrer: null, country: null, ip: "5.6.7.8", device: "DESKTOP" },
];

const linkHits: LegacyHitRow[] = [
  { id: "hl_1", kyteId: "u_google_full", timestamp: T2, referrer: null, country: null, ip: "1.2.3.4", device: "MOBILE", linkTitle: "GitHub", linkURL: "https://github.com/aleem" },
];

export const LEGACY_FIXTURE: LegacyFixture = {
  users,
  accounts,
  drafts,
  prods,
  domains,
  sessions,
  verificationTokens,
  pageHits,
  linkHits,
};
