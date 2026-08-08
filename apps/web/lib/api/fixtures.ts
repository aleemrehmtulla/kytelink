import { emptyProfileContent, type ProfileContent, type Role, type KyteAccess } from "@kytelink/schemas";
import type { ModerationStatus } from "@kytelink/schemas";

interface StoreUser {
  id: string;
  email: string;
  createdAt: string;
  image?: string | null;
  passkeys: { id: string; name: string; createdAt: string; lastUsedAt: string | null }[];
}

interface StoreMembership {
  membershipId: string;
  userId: string;
  email: string;
  role: Role;
  kyteAccess: KyteAccess;
  kyteGrants: { kyteId: string; role: Role }[];
}

export interface StoreOrg {
  id: string;
  name: string;
  ownerUserId: string;
  personal: boolean;
  members: StoreMembership[];
}

export interface StoreKyte {
  id: string;
  orgId: string;
  username: string | null;
  moderationStatus: ModerationStatus;
  suspensionReason: string | null;
  published: boolean;
  updatedAt: string;
  draft: ProfileContent;
  publishedContent: ProfileContent | null;
}

interface StoreSchedule {
  id: string;
  kyteId: string;
  scheduledFor: string;
  timezone: string;
  status: "PENDING" | "PUBLISHED" | "CANCELED" | "FAILED";
  createdBy: string;
  createdAt: string;
  snapshot: ProfileContent;
}

export interface StorePreview {
  id: string;
  kyteId: string;
  token: string;
  passcode: string;
  expiresAt: string;
  createdAt: string;
}

interface StoreDomain {
  id: string;
  kyteId: string;
  host: string;
  status: "PENDING" | "VERIFYING" | "ACTIVE" | "ERROR";
  createdAt: string;
}

interface StoreInvite {
  id: string;
  orgId: string;
  orgName: string;
  role: Role;
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "REVOKED" | "EXPIRED";
  invitedByEmail: string | null;
  invitedEmail: string;
  expiresAt: string;
}

interface StoreAudit {
  id: string;
  action: string;
  actorUserId: string;
  actorEmail: string | null;
  orgId: string | null;
  kyteId: string | null;
  meta: Record<string, unknown>;
  createdAt: string;
}

export interface MockStore {
  users: StoreUser[];
  orgs: StoreOrg[];
  kytes: StoreKyte[];
  schedules: StoreSchedule[];
  previews: StorePreview[];
  domains: StoreDomain[];
  invites: StoreInvite[];
  audit: StoreAudit[];
  usernames: Set<string>;
}

export type MockPersona = "solo" | "team";

const NOW = "2026-07-18T12:00:00.000Z";

function content(overrides: Partial<ProfileContent>): ProfileContent {
  return { ...emptyProfileContent(), ...overrides };
}

const AGENT_USER: StoreUser = {
  id: "agent",
  email: "agent@kytelink.dev",
  createdAt: "2026-01-04T09:00:00.000Z",
  passkeys: [
    { id: "pk_1", name: "MacBook Pro", createdAt: "2026-02-01T09:00:00.000Z", lastUsedAt: NOW },
  ],
};

const agentPublished = content({
  displayName: "Agent",
  description: "Building Kytelink in public. Follow along.",
  theme: "midnight",
  links: [
    { title: "My newsletter", link: "https://kytelink.com/blog", emoji: "📮" },
    { title: "Star on GitHub", link: "https://github.com/kytelink", emoji: "FaGithub" },
  ],
  icons: [
    { name: "Twitter", url: "https://twitter.com/agent" },
    { name: "Github", url: "https://github.com/agent" },
  ],
  avatar: null,
});

const agentDraft = content({
  displayName: "Agent",
  description: "Building Kytelink in public. Follow along.",
  theme: "midnight",
  links: [
    { title: "My newsletter", link: "https://kytelink.com/blog", emoji: "📮" },
    { title: "Star on GitHub", link: "https://github.com/kytelink", emoji: "FaGithub" },
    { title: "New: launch notes", link: "https://kytelink.com/launch", emoji: "🚀" },
  ],
  icons: [
    { name: "Twitter", url: "https://twitter.com/agent" },
    { name: "Github", url: "https://github.com/agent" },
  ],
  avatar: null,
});

export function createStore(persona: MockPersona): MockStore {
  const usernames = new Set<string>(["taken", "aleem", "logan", "agent", "acme"]);

  const users: StoreUser[] = [AGENT_USER];
  const orgs: StoreOrg[] = [
    {
      id: "org_agent_personal",
      name: "Agent's Organization",
      ownerUserId: "agent",
      personal: true,
      members: [
        {
          membershipId: "m_agent_personal",
          userId: "agent",
          email: "agent@kytelink.dev",
          role: "OWNER",
          kyteAccess: "ALL",
          kyteGrants: [],
        },
      ],
    },
  ];
  const kytes: StoreKyte[] = [
    {
      id: "agent",
      orgId: "org_agent_personal",
      username: "agent",
      moderationStatus: "APPROVED",
      suspensionReason: null,
      published: true,
      updatedAt: NOW,
      draft: agentDraft,
      publishedContent: agentPublished,
    },
    {
      id: "kyte_agent_draft",
      orgId: "org_agent_personal",
      username: "agent-side",
      moderationStatus: "APPROVED",
      suspensionReason: null,
      published: false,
      updatedAt: NOW,
      draft: content({ displayName: "Side project", theme: "paper" }),
      publishedContent: null,
    },
  ];
  usernames.add("agent-side");

  users.push({ id: "modbot", email: "mod@kytelink.dev", createdAt: NOW, passkeys: [] });
  orgs.push({
    id: "org_mod",
    name: "Moderation demo",
    ownerUserId: "modbot",
    personal: false,
    members: [
      {
        membershipId: "m_mod",
        userId: "modbot",
        email: "mod@kytelink.dev",
        role: "OWNER",
        kyteAccess: "ALL",
        kyteGrants: [],
      },
    ],
  });
  const suspendedContent = content({ displayName: "Suspended user", theme: "dark" });
  const orgSuspendedContent = content({ displayName: "Org suspended user", theme: "dusk" });
  kytes.push(
    {
      id: "kyte_suspended",
      orgId: "org_mod",
      username: "suspended-demo",
      moderationStatus: "SUSPENDED",
      suspensionReason: "Links pointed at a credential-harvesting page.",
      published: true,
      updatedAt: NOW,
      draft: suspendedContent,
      publishedContent: suspendedContent,
    },
    // Mirrors the seed's org-scoped fixture. The mock store has no org
    // suspension, so it carries the EFFECTIVE status the API would send.
    {
      id: "kyte_org_suspended",
      orgId: "org_mod",
      username: "org-suspended-demo",
      moderationStatus: "SUSPENDED",
      suspensionReason: "The organization that owns this page is suspended.",
      published: true,
      updatedAt: NOW,
      draft: orgSuspendedContent,
      publishedContent: orgSuspendedContent,
    },
  );
  usernames.add("suspended-demo");
  usernames.add("org-suspended-demo");

  // Regression fixture for the JSON-LD stored-XSS guard (B1): a displayName that
  // would break out of the <script type="application/ld+json"> tag if unescaped.
  const xssContent = content({
    displayName: '</script><script>window.__xss__=1</script>',
    description: "XSS escape regression fixture",
    theme: "dark",
  });
  kytes.push({
    id: "kyte_xss",
    orgId: "org_mod",
    username: "xss-demo",
    moderationStatus: "APPROVED",
    suspensionReason: null,
    published: true,
    updatedAt: NOW,
    draft: xssContent,
    publishedContent: xssContent,
  });
  usernames.add("xss-demo");

  const store: MockStore = {
    users,
    orgs,
    kytes,
    schedules: [],
    previews: [],
    domains: [],
    invites: [],
    audit: [],
    usernames,
  };

  if (persona === "team") {
    users.push(
      { id: "sarah", email: "sarah@acme.dev", createdAt: NOW, passkeys: [] },
      { id: "diego", email: "diego@acme.dev", createdAt: NOW, passkeys: [] },
    );
    orgs.push({
      id: "org_agency_demo",
      name: "Acme Agency",
      ownerUserId: "sarah",
      personal: false,
      members: [
        {
          membershipId: "m_sarah",
          userId: "sarah",
          email: "sarah@acme.dev",
          role: "OWNER",
          kyteAccess: "ALL",
          kyteGrants: [],
        },
        {
          membershipId: "m_agent_agency",
          userId: "agent",
          email: "agent@kytelink.dev",
          role: "MANAGER",
          kyteAccess: "ALL",
          kyteGrants: [],
        },
        {
          membershipId: "m_diego",
          userId: "diego",
          email: "diego@acme.dev",
          role: "EDITOR",
          kyteAccess: "SELECTED",
          kyteGrants: [{ kyteId: "kyte_acme_main", role: "EDITOR" }],
        },
      ],
    });
    kytes.push(
      {
        id: "kyte_acme_main",
        orgId: "org_agency_demo",
        username: "acme",
        moderationStatus: "APPROVED",
        suspensionReason: null,
        published: true,
        updatedAt: NOW,
        draft: content({ displayName: "Acme Co", theme: "default", description: "We make things." }),
        publishedContent: content({ displayName: "Acme Co", theme: "default", description: "We make things." }),
      },
      {
        id: "kyte_acme_events",
        orgId: "org_agency_demo",
        username: "acme-events",
        moderationStatus: "APPROVED",
        suspensionReason: null,
        published: false,
        updatedAt: NOW,
        draft: content({ displayName: "Acme Events", theme: "dusk" }),
        publishedContent: null,
      },
      {
        id: "kyte_acme_suspended",
        orgId: "org_agency_demo",
        username: "acme-flagged",
        moderationStatus: "SUSPENDED",
        suspensionReason: "Impersonating a delivery company.",
        published: true,
        updatedAt: NOW,
        draft: content({ displayName: "Acme Flagged", theme: "dark" }),
        publishedContent: content({ displayName: "Acme Flagged", theme: "dark" }),
      },
    );
    usernames.add("acme-events");
    usernames.add("acme-flagged");
    store.audit.push(
      {
        id: "a1",
        action: "profile_published",
        actorUserId: "sarah",
        actorEmail: "sarah@acme.dev",
        orgId: "org_agency_demo",
        kyteId: "kyte_acme_main",
        meta: {},
        createdAt: "2026-07-17T18:00:00.000Z",
      },
      {
        id: "a2",
        action: "invite_sent",
        actorUserId: "sarah",
        actorEmail: "sarah@acme.dev",
        orgId: "org_agency_demo",
        kyteId: null,
        meta: { email: "diego@acme.dev" },
        createdAt: "2026-07-16T10:00:00.000Z",
      },
    );
    store.invites.push({
      id: "inv_pending",
      orgId: "org_agency_demo",
      orgName: "Acme Agency",
      role: "EDITOR",
      status: "PENDING",
      invitedByEmail: "sarah@acme.dev",
      invitedEmail: "agent@kytelink.dev",
      expiresAt: "2026-08-01T00:00:00.000Z",
    });
  }

  return store;
}
