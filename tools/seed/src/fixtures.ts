import {
  defaultOrgName,
  emptyProfileContent,
  profileContentSchema,
  type ModerationStatus,
  type ProfileContent,
  type Role,
} from "@kytelink/schemas";

export const AGENCY_ORG_ID = "org_agency_demo";

export function makeContent(partial: Partial<ProfileContent>): ProfileContent {
  return profileContentSchema.parse({ ...emptyProfileContent(), ...partial });
}

export type SeedUser = {
  id: string;
  email: string;
  name: string;
};

export type SeedOrgMember = {
  userId: string;
  role: Role;
  kyteAccess: "ALL" | "SELECTED";
};

export type SeedKyteGrant = {
  kyteId: string;
  userId: string;
  role: Role;
};

export type SeedKyte = {
  id: string;
  orgId: string;
  username: string | null;
  ownerUserId: string;
  content: ProfileContent;
  published: boolean;
  moderationStatus: ModerationStatus;
  publishSeq: number;
  avatarAssetId?: string | null;
};

const POLY_LINKS = [
  { title: "GitHub", link: "https://github.com/aleemrehmtulla", emoji: "FaGithub", color: "transparent" },
  { title: "Headshot", link: "https://kytelink.com", emoji: "https://cdn.kytelink.com/static/brand/aleem.png" },
  { title: "Say hi", link: "https://kytelink.com/aleem", emoji: "👋" },
];

const CONTACT_ICONS = [
  { name: "Twitter", url: "https://twitter.com/aleemrehmtulla" },
  { name: "Github", url: "https://github.com/aleemrehmtulla" },
  { name: "Contact", url: null },
];

export const AGENCY_OWNER: SeedUser = {
  id: "usr_agency_owner",
  email: "owner@agency.demo",
  name: "Aleem Rehmtulla",
};

export const AGENCY_USERS: SeedUser[] = [
  AGENCY_OWNER,
  { id: "usr_agency_admin", email: "admin@agency.demo", name: "Agency Admin" },
  { id: "usr_agency_manager", email: "manager@agency.demo", name: "Agency Manager" },
  { id: "usr_intern_all", email: "intern-all@agency.demo", name: "Intern All-Access" },
  { id: "usr_intern_selected", email: "intern-selected@agency.demo", name: "Intern Selected" },
];

export const AGENCY_MEMBERS: SeedOrgMember[] = [
  { userId: "usr_agency_owner", role: "OWNER", kyteAccess: "ALL" },
  { userId: "usr_agency_admin", role: "ADMIN", kyteAccess: "ALL" },
  { userId: "usr_agency_manager", role: "MANAGER", kyteAccess: "ALL" },
  { userId: "usr_intern_all", role: "EDITOR", kyteAccess: "ALL" },
  { userId: "usr_intern_selected", role: "EDITOR", kyteAccess: "SELECTED" },
];

const AGENCY_THEMES = [
  "default",
  "dark",
  "spacegray",
  "popsicle",
  "froggy",
  "lavender",
  "gradientblue",
  "gradientpink",
] as const;

const AGENCY_KYTE_SLUGS = [
  "aleem-demo",
  "agency-dark",
  "agency-space",
  "agency-pop",
  "agency-frog",
  "agency-lav",
  "agency-blue",
  "agency-pink",
];

export const AGENCY_AVATAR_ASSET_ID = "asset_agency_avatar";

export const AGENCY_KYTES: SeedKyte[] = AGENCY_THEMES.map((theme, index) => {
  const id = `kyte_ag_${index + 1}`;
  const isFlagship = index === 0;
  return {
    id,
    orgId: AGENCY_ORG_ID,
    username: AGENCY_KYTE_SLUGS[index] ?? `agency-${index + 1}`,
    ownerUserId: AGENCY_OWNER.id,
    published: true,
    moderationStatus: "APPROVED" as ModerationStatus,
    publishSeq: isFlagship ? 3 : 1,
    avatarAssetId: isFlagship ? AGENCY_AVATAR_ASSET_ID : null,
    content: makeContent({
      displayName: isFlagship ? "Aleem — Agency Demo" : `Agency ${theme}`,
      description: isFlagship
        ? "Founder of Kytelink. This kyte exercises all three link-prefix kinds."
        : `A ${theme}-themed agency kyte.`,
      theme,
      links: isFlagship ? POLY_LINKS : [POLY_LINKS[index % POLY_LINKS.length]!],
      icons: isFlagship ? CONTACT_ICONS : [CONTACT_ICONS[0]!],
    }),
  };
});

export const AGENCY_FLAGSHIP_KYTE = AGENCY_KYTES[0]!;

export const AGENCY_KYTE_GRANTS: SeedKyteGrant[] = [
  { kyteId: "kyte_ag_2", userId: "usr_intern_selected", role: "EDITOR" },
  { kyteId: "kyte_ag_3", userId: "usr_intern_selected", role: "VIEWER" },
];

type PersonalKyteDef = {
  slug: string;
  username: string | null;
  content: Partial<ProfileContent>;
  published: boolean;
  moderationStatus: ModerationStatus;
  // Suspends the personal org rather than the kyte, so the seed covers the
  // org-scoped path where the kyte's own moderationStatus stays APPROVED.
  orgSuspended?: boolean;
};

const LONG_CONTENT: Partial<ProfileContent> = {
  displayName: "L".repeat(100),
  description: "D".repeat(300),
  theme: "paper",
  seoTitle: "T".repeat(100),
  seoDescription: "S".repeat(300),
  links: Array.from({ length: 10 }, (_, i) => ({
    title: `Link ${i + 1} ${"x".repeat(80)}`.slice(0, 100),
    link: `https://example.com/very/long/path/${i}/${"a".repeat(40)}`,
    emoji: i % 3 === 0 ? "FaTwitter" : i % 3 === 1 ? "https://cdn.kytelink.com/static/logos/icon.png" : "🔗",
    color: "transparent",
  })),
};

const PERSONAL_DEFS: PersonalKyteDef[] = [
  {
    slug: "gothere",
    username: "gothere",
    published: true,
    moderationStatus: "APPROVED",
    content: {
      displayName: "Redirects Away",
      description: "Bounces visitors straight to another site.",
      theme: "gradientgreen",
      shouldRedirect: true,
      redirectUrl: "https://example.com/landing",
    },
  },
  {
    slug: "suspended-demo",
    username: "suspended-demo",
    published: true,
    moderationStatus: "SUSPENDED",
    content: {
      displayName: "Suspended Kyte",
      description: "Under moderation lockdown.",
      theme: "midnight",
      links: [{ title: "Blocked link", link: "https://example.com", emoji: "⛔" }],
    },
  },
  {
    slug: "org-suspended-demo",
    username: "org-suspended-demo",
    published: true,
    moderationStatus: "APPROVED",
    orgSuspended: true,
    content: {
      displayName: "Org Suspended Kyte",
      description: "Its organization is suspended; renders the blocked shell.",
      theme: "dusk",
    },
  },
  {
    slug: "maxedout",
    username: "maxedout",
    published: true,
    moderationStatus: "APPROVED",
    content: LONG_CONTENT,
  },
  { slug: "norm-default", username: "norm-default", published: true, moderationStatus: "APPROVED", content: { displayName: "Normal Default", theme: "default", links: [POLY_LINKS[2]!] } },
  { slug: "norm-dark", username: "norm-dark", published: true, moderationStatus: "APPROVED", content: { displayName: "Normal Dark", theme: "dark", links: [POLY_LINKS[0]!] } },
  { slug: "norm-pop", username: "norm-pop", published: true, moderationStatus: "APPROVED", content: { displayName: "Normal Popsicle", theme: "popsicle", links: [POLY_LINKS[1]!] } },
  { slug: "norm-frog", username: "norm-frog", published: true, moderationStatus: "APPROVED", content: { displayName: "Normal Froggy", theme: "froggy", icons: [CONTACT_ICONS[0]!] } },
  { slug: "norm-lav", username: "norm-lav", published: true, moderationStatus: "APPROVED", content: { displayName: "Normal Lavender", theme: "lavender" } },
  { slug: "norm-blue", username: "norm-blue", published: true, moderationStatus: "APPROVED", content: { displayName: "Normal Blue", theme: "gradientblue" } },
  { slug: "norm-pink", username: "norm-pink", published: true, moderationStatus: "APPROVED", content: { displayName: "Normal Pink", theme: "gradientpink" } },
  { slug: "draft-only", username: null, published: false, moderationStatus: "APPROVED", content: { displayName: "Unpublished Draft", theme: "spacegray" } },
];

export type SeedPersonal = {
  user: SeedUser;
  orgId: string;
  orgName: string;
  orgSuspended: boolean;
  kyte: SeedKyte;
};

export const PERSONAL_ORGS: SeedPersonal[] = PERSONAL_DEFS.map((def) => {
  const userId = `usr_p_${def.slug}`;
  const orgId = `org_p_${def.slug}`;
  const name = def.content.displayName ?? def.slug;
  return {
    user: { id: userId, email: `${def.slug}@people.demo`, name },
    orgId,
    orgName: defaultOrgName(name, `${def.slug}@people.demo`),
    orgSuspended: def.orgSuspended ?? false,
    kyte: {
      id: userId,
      orgId,
      username: def.username,
      ownerUserId: userId,
      published: def.published,
      moderationStatus: def.moderationStatus,
      publishSeq: def.published ? 1 : 0,
      avatarAssetId: null,
      content: makeContent(def.content),
    },
  };
});
