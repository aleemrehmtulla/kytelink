# 03 — Database: Postgres schema + the schemas contract

*Read this if: you're building `packages/db`, `packages/schemas`, the API, or migration. Companion: [04-organizations.md](04-organizations.md) (semantics of the org tables).*

## Naming note

Core entity is a **Kyte** (one Kytelink page) living inside an **Organization**; **Users** hold auth and connect via memberships. **Migration keeps `Kyte.id = old userId`** so R2 prefixes, ClickHouse history, and analytics continuity survive without key rewrites. Personal orgs are created lazily at first kyte creation, never at signup ([04-organizations.md](04-organizations.md)).

## Prisma schema (`packages/db`)

```prisma
model User {
  id            String   @id            // preserved cuid for migrated users
  email         String   @unique
  emailVerified DateTime?
  name          String?  image String?  // auth-provider values, not kyte content
  role          Role     @default(USER) // USER | ADMIN (platform admin via ADMIN_EMAILS)
  maxOwnedOrgs  Int?                    // limit overrides — null = defaults (3 created / 7 joined, 10 total)
  maxJoinedOrgs Int?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  orgMemberships OrgMember[]
  // + better-auth account/session/verification/passkey models (05-auth.md)
}

model Organization {
  id        String  @id @default(cuid())
  name      String
  personal  Boolean @default(false)     // auto-created solo org; UI hides org concepts
  createdAt DateTime @default(now())
  // limit overrides — null = code default from consts/limits.ts (04-organizations.md)
  maxKytes             Int?
  maxMembers           Int?             // members + pending invites
  maxSchedulesPerKyte  Int?
  maxPreviewLinks      Int?
  maxStorageBytes      BigInt?          // total across the org's kytes; default 250MB
  members  OrgMember[]
  invites  OrgInvite[]
  kytes    Kyte[]
  auditLog AuditLog[]
}

model OrgMember {
  orgId      String
  userId     String
  role       Role                      // ONE ladder: OWNER | ADMIN | MANAGER | EDITOR | VIEWER
                                        // OWNER/ADMIN imply kyteAccess = ALL (04-organizations.md)
  kyteAccess KyteAccess                // ALL | SELECTED
  createdAt   DateTime @default(now())
  invitedById String?
  kyteGrants  KyteMember[]              // rows deleted with this membership → one-click revoke
  @@id([orgId, userId])
  @@index([userId])
}

model KyteMember {                      // per-kyte grant, scoped INSIDE an org membership
  orgId  String
  kyteId String
  userId String
  role   Role                           // MANAGER | EDITOR | VIEWER only (validated in app layer)
  member OrgMember @relation(fields: [orgId, userId], references: [orgId, userId], onDelete: Cascade)
  @@id([kyteId, userId])
  @@index([userId])
}

model Kyte {                            // DRAFT + identity (old KyteDraft, generalized)
  id             String  @id            // migration: = old userId
  orgId          String
  username       String? @unique        // lowercase; null until onboarding completes
  displayName    String?  description String?
  theme          String  @default("default")
  customFont     String?  customColor String?
  seoTitle       String?  seoDescription String?
  redirectUrl    String?  shouldRedirect Boolean @default(false)
  links          Json    @default("[]") // TLink[] — zod-validated on every write
  icons          Json    @default("[]") // TIcon[]
  avatarAssetId  String?
  createdAt DateTime @default(now())  updatedAt DateTime @updatedAt
  published    PublishedKyte?
  schedules    ScheduledPublish[]
  previewLinks PreviewLink[]
  assets       Asset[]
  domains      Domain[]
  @@index([orgId])
}

model PublishedKyte {                   // LIVE snapshot (old KyteProd)
  kyteId   String  @id
  username String? @unique
  // …same content fields as Kyte (generated from the ONE ProfileContent
  //  definition in packages/schemas so the two sides can never drift)…
  moderationStatus ModerationStatus @default(APPROVED) // APPROVED | SUSPENDED | BANNED
  publishSeq    Int      @default(0)   // monotonic; every publish increments — serializes
                                        // manual vs scheduled publishes; moderation verdicts
                                        // and revalidations no-op if a newer seq exists
  publishedAt   DateTime @updatedAt
  publishedById String?
  contentHash   String?                 // moderation cache key; also keys the OG image
}

model OrgInvite {
  id          String @id @default(cuid())
  orgId       String
  email       String                    // lowercase; strict match on accept
  role        Role                      // the granted ladder role; ADMIN only by an OWNER, never OWNER
  kyteAccess  KyteAccess
  kyteGrants  Json?                     // [{kyteId, role}] when SELECTED (roles ≤ MANAGER)
  invitedById String
  tokenHash   String @unique            // sha256; raw token never stored
  status      InviteStatus @default(PENDING) // PENDING|ACCEPTED|DECLINED|REVOKED|EXPIRED
  createdAt DateTime @default(now())  expiresAt DateTime  respondedAt DateTime?  remindedAt DateTime?
  @@index([email, status])
  // partial unique in raw SQL migration: UNIQUE (orgId, email) WHERE status = 'PENDING'
}

model ScheduledPublish {                // up to 3 PENDING per kyte (04-organizations.md)
  id           String @id @default(cuid())
  kyteId       String
  scheduledFor DateTime                 // UTC
  timezone     String                   // IANA, for display
  snapshot     Json                     // ProfileContent frozen at schedule/update time
  status       ScheduleStatus @default(PENDING) // PENDING|PUBLISHED|CANCELED|FAILED
  createdById  String
  createdAt DateTime @default(now())  firedAt DateTime?  error String?
  @@index([status, scheduledFor])       // the due-sweep query
  @@index([kyteId, status])
}

model PreviewLink {
  id           String @id @default(cuid())
  kyteId       String
  tokenHash    String @unique
  passcodeHash String                    // sha256 of the generated 6-digit passcode; shown once at creation
  createdById  String
  createdAt DateTime @default(now())  expiresAt DateTime  revokedAt DateTime?
  @@index([kyteId])
}

model AuditLog {
  id      String @id @default(cuid())
  orgId   String
  kyteId  String?
  actorId String
  action  String                        // enum-like const list in packages/schemas
  summary String                        // human-readable one-liner
  meta    Json?
  createdAt DateTime @default(now())
  @@index([orgId, createdAt])
  @@index([kyteId, createdAt])
}

model Asset {
  id String @id @default(cuid())
  kyteId String
  uploadedById String?
  key String @unique                    // u/{kyteId}/{kind}/{ulid}.{ext}; LQIP sibling at {ulid}.lqip.{ext}
  kind AssetKind                        // AVATAR | LINK_IMAGE | OG_IMAGE
  contentType String  sizeBytes Int
  width Int?  height Int?
  createdAt DateTime @default(now())
  @@index([kyteId])
}

model Domain {
  domain String @id                     // lowercase, no scheme
  kyteId String
  verified Boolean @default(false)
  createdAt DateTime @default(now())
  @@index([kyteId])
}

model ModerationReview {
  id String @id @default(cuid())
  kyteId String  contentHash String
  verdict ModerationVerdict             // APPROVE | SUSPEND
  categories String[]  reason String  provider String  confidence Float?
  signals Json?                         // tripped signals + evidence: sus_link/sus_name/
                                        // sus_redirect/sus_email/nsfw_* (10-moderation.md)
  reviewedBy String?
  createdAt DateTime @default(now())
  @@index([kyteId, createdAt])  @@index([verdict, createdAt])
}

model AbuseReport {                     // landing-footer /report form (10-moderation.md)
  id        String @id @default(cuid())
  username  String                      // as submitted; resolved to kyteId when it matches
  kyteId    String?
  reason    String                      // const list: impersonation | nsfw | other
  details   String?
  ipHash    String
  status    ReportStatus @default(OPEN) // OPEN | ACTIONED | DISMISSED
  createdAt DateTime @default(now())  reviewedAt DateTime?  reviewedBy String?
  @@index([status, createdAt])
}

model AdminAlert {                      // in-dashboard ops alerts — NEVER emailed (06-api.md)
  id        String @id @default(cuid())
  kind      String                      // revalidate-dead-letter | moderation-fail-open |
                                        // schedule-failed | worker | seed
  message   String
  meta      Json?
  createdAt DateTime @default(now())  resolvedAt DateTime?  resolvedBy String?
  @@index([resolvedAt, createdAt])
}
```

Notes:

- **No analytics tables in Postgres** — ClickHouse only ([07-analytics.md](07-analytics.md)).
- One-click revoke = `DELETE OrgMember` → `KyteMember` rows cascade via the composite relation.
- Integrity invariant the app layer asserts on every KyteMember write: `kyte.orgId === kyteMember.orgId` (a grant can never point across orgs). Kyte transfer rewrites `orgId` and purges old-org grants in one transaction ([04-organizations.md](04-organizations.md)).
- Email lives only on `User`. Old `legacy`/`setup` columns die.
- Hot-query indexes: `OrgMember(userId)` + `KyteMember(userId)` (switcher), `OrgInvite(email,status)` (invites tab), `ScheduledPublish(status,scheduledFor)` (sweep), `AuditLog(orgId,createdAt)`.
- pgbouncer-pooled URL + `directUrl` for migrations.

## `packages/schemas` — the contract package

zod schemas + inferred types for: `Link`/`Icon`/`ProfileContent` (single source for Kyte + PublishedKyte + schedule snapshots), `ThemeKey/FontKey/ColorKey` (+ token→hex map), the single `Role` ladder + **`effectiveRole(orgMember, kyteMember?)`** + **`can(role, action)`** (the only permission logic in the codebase), invite payloads, schedule shapes, audit action list, beacon payloads, product events, moderation verdicts, `consts/limits.ts` defaults, and per-app env schemas (fail-fast boot validation).

Run `prisma format` in CI — the committed schema is always formatter-clean.

Validation policy on every write: http(s) URLs only after optional `https://` prefixing; reject `javascript:`/`data:`; max lengths (title 100, url 2048, description 300); username `[a-z0-9-_]{1,30}` + reserved blocklist (`edit, api, admin, login, signup, auth, t, internal, invites, preview, account, new, 404, 500, sitemap.xml, robots.txt, features, use-cases, legal, terms-of-service, privacy-policy, report, landing-assets`, … — the landing-route entries are sourced from the same shared `landing-routes` const the web middleware uses, [11-web.md](11-web.md), so the two can never drift).
