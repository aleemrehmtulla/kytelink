# 04 — Organizations: orgs, kytes, roles, invites, scheduling, preview links, audit

*Read this if: you're building the API, web editor, admin, emails, or migration. This is the biggest functional change in the rewrite. Companion: [03-database.md](03-database.md) (tables), [05-auth.md](05-auth.md), [06-api.md](06-api.md) (enforcement), [22-onboarding.md](22-onboarding.md) (how orgs stay invisible to solo users).*

## The simplicity mandate (read first)

Kytelink's magic today is "you just go make a Kytelink." **Organizations must not cost us that.** All org functionality exists, but regular users never encounter it: signup → onboarding → live page, no org named, no workspace picker, no team prompts. The word "organization" (surfaced as **"team"** in all user-facing copy) appears only when the user does something that needs it — invites someone, accepts an invite, or creates a second org. Progressive disclosure is a hard requirement, not a styling choice: the solo experience must look and feel exactly as simple as the legacy product. The UX/parity critics test this explicitly ("can a solo user complete signup→publish→edit→analytics without ever seeing a team concept?").

## The model

Three layers, all real tables:

- **Organization** — the tenant. Owns kytes and holds members. Every kyte belongs to exactly one org. Each user gets a **personal org** (`personal=true`), created **lazily at first kyte creation** (onboarding step 4 or "New Kytelink") — NOT at signup, so an invited user who never makes their own page has exactly one membership: the org that invited them. Personal-org name fallback chain: user name → username → email local-part → "My Kytelink". Personal orgs are never user-deletable (they go only with account deletion) and are reused, never duplicated — deleting your last kyte leaves the empty personal org, and the next kyte creation uses it.
- **Kyte** — one Kytelink page, inside an org.
- **Memberships** — `OrgMember` (org-level: who's in the org, what they can reach) + `KyteMember` (per-kyte grants). Together they answer "what can this user do on this kyte."

The agency case this must nail: an agency org owns 15 kytes. An intern joins with access to **all** kytes (one grant) *or* just 2 of the 15 (selected grants). Firing the intern = **remove one OrgMember row → every grant, session-visible kyte, and pending anything of theirs in that org disappears in one click.** Granularity and one-click revocation coexist because per-kyte grants live *inside* the org membership.

### One role ladder (founder-confirmed — no separate org/kyte role axes)

There is exactly **one `Role` enum**: `OWNER > ADMIN > MANAGER > EDITOR > VIEWER`. A member holds one role, assigned either **org-wide** (`kyteAccess: ALL` — applies to every current and future kyte) or **per-kyte** (`kyteAccess: SELECTED` + `KyteMember` rows, each carrying a role). Rules:

- `OWNER` and `ADMIN` are org-wide only (`kyteAccess` forced to `ALL`) — running the team is inherently org-scoped. `MANAGER`/`EDITOR`/`VIEWER` can be granted org-wide or per-kyte.
- **Invariant: `KyteMember` rows exist ONLY while `kyteAccess = SELECTED`.** ALL and SELECTED are mutually exclusive modes — there is no "org-wide role with a per-kyte override." `team.updateAccess` deletes a member's KyteMember rows in the same transaction that switches them to ALL, and `effectiveRole` may assert the invariant.
- **`effectiveRole(orgMember, kyteMember?)`** (single function in `packages/schemas`): OWNER/ADMIN → that role on every kyte; otherwise the explicit `KyteMember.role` if a row exists, else `kyteAccess=ALL ? orgMember.role : no access`.
- Everything server-side derives from this one function; UI affordances derive from the same matrix via `can(role, action)`.

| Capability | OWNER | ADMIN | MANAGER | EDITOR | VIEWER |
|---|---|---|---|---|---|
| View editor + drafts | ✓ | ✓ | ✓ | ✓ | ✓ |
| **View analytics** | ✓ | ✓ | ✓ | ✓ | — |
| Edit drafts, upload assets, preview links | ✓ | ✓ | ✓ | ✓ | — |
| Publish now / schedule / cancel schedules | ✓ | ✓ | ✓ | — | — |
| Change username, manage custom domains | ✓ | ✓ | ✓ | — | — |
| Create kytes, manage members (below own role), org settings | ✓ | ✓ | — | — | — |
| Delete kyte, transfer between orgs, delete org, manage owners | ✓ | — | — | — | — |

- **EDITOR is the "no publish" role**: full draft editing and sharing preview links, but Publish/Schedule are disabled with the explainer "A manager reviews and ships changes."
- **VIEWER is the "no analytics" role** (founder-confirmed: analytics visibility is baked into roles, no per-member toggle): sees the editor and drafts read-only, no numbers.
- **MANAGER** is the trusted hands-on role: publishes, schedules, and manages domains/usernames — but not people.
- Last org OWNER can't leave/demote/be removed; org deletion requires OWNER + typed confirmation and is blocked while kytes exist.

### Role UI (make it effortless to understand and edit)

The **Team tab** is the one place a solo user can encounter the concept — by choice, not by force: its empty state is a single friendly card ("Working with someone? Invite them to help manage this page.") with one input, no role jargon until a second person actually exists. Populated, it's org-scoped with a per-kyte lens: each member row shows an access summary chip (`All kytes · Editor`, `2 of 15 kytes`, `Org admin`). Clicking a row opens a sheet: org role selector (one-line description under each option), access mode toggle (All kytes ↔ Selected), and — when Selected — a kyte list with per-kyte role dropdowns. Every role name everywhere carries its one-liner; no bare jargon. Changing anything is one interaction + autosaved with an undo toast. Animate the sheet and row updates (framer-motion, subtle — [14-design.md](14-design.md)).

## Limits (stored in DB, admin-editable — free today, maybe paid someday)

Defaults live in code (`consts/limits.ts`); overrides live on the Organization/User rows (null = default). Admin edits them in the org/user detail views ([13-admin.md](13-admin.md)); the admin editor accepts overrides **up to 100** per knob (founder raises manually on request; the ceiling is a sanity guard, not product policy).

| Limit | Default | Stored on |
|---|---|---|
| Kytes per org | 10 | Organization |
| People with access per org (members + pending invites) | 10 | Organization |
| Orgs a user can create/own | 3 | User |
| Orgs a user can join beyond their own (10 total) | 7 | User |
| Pending schedules per kyte | 3 | Organization |
| Active preview links per kyte | 5 | Organization |
| **Total storage across the org's kytes** | **250 MB** | Organization |

Storage is enforced at `assets.createUploadUrl`: current org total (`SUM(Asset.sizeBytes)` across its kytes) + the declared incoming size must fit, else `LIMIT_REACHED` → the contact-Aleem modal. Accounting is on the **normalized** `Asset.sizeBytes` (LQIP siblings excluded — they're a rounding error); the presign check is a pre-check on declared size, and a small overshoot from concurrent uploads is accepted — no re-check at finalize, no extra machinery. The org's usage shows in the editor's Settings ("34 MB of 250 MB used") and per-org in admin.

**Limit-hit modal** (shared component, warm not corporate): "You've hit the limit on {thing}." + a contact card — **Aleem Rehmtulla, founder** (photo committed to `packages/cdn` `assets/brand/aleem.png`, sourced once from `https://aleemrehmtulla.com/img/aleem/lisbon.png` during scaffold) + a **"Message Aleem on X"** button linking to his X **profile** (`@aleemrehmtulla`, one const in `consts/`) + the instruction: **"DM him with your Kytelink username and what you're building — he'll raise your limit."** Animated in (scale/fade). Same component everywhere any limit can hit.

## Kyte transfer between orgs (v1, founder-confirmed)

An org OWNER on the source side who is OWNER/ADMIN in the destination org can move a kyte (agency ↔ creator hand-offs). Effects, atomically: `Kyte.orgId` changes; per-kyte grants from the old org are deleted (old-org members lose access unless they're in the new org); the new org's ALL-access members gain their role's access; domains and assets follow the kyte (keys don't move — they're keyed by kyteId); audit-logged in both orgs. Confirmation modal spells out exactly who gains/loses access before committing. Destination must be within its kyte limit.

## Invites (org-scoped, accept-required)

1. **Send** (org OWNER/ADMIN): email + access payload — either org-wide (`ALL` + a role ≤ inviter's own) or selected `[{kyteId, role}]` with roles ≤ MANAGER. `ADMIN` grantable only by an OWNER; `OWNER` never grantable via invite (promote after joining). Normalize lowercase → reject existing member → reject existing PENDING for (org, email) → check the people-limit (members + pending) → create `OrgInvite` (random 32-byte token, store sha256 only, 14-day expiry) → send via `packages/emails`.
2. **Email:** "{Inviter} invited you to {org/kyte name} on Kytelink" + what they'll be able to do in plain words + **Accept invitation** → `kytelink.com/invites?token=…` + "Didn't expect this? Ignore this email — nothing happens without you."
3. **Accept:** `/invites` requires login; the invite is visible **only if the session's verified email matches the invite email** (strict — founder-confirmed; forwarded links can't hijack). Arriving via `?token=` with a mismatched session email is NOT a silent empty list — the page shows "This invite was sent to a•••@x.com — sign in with that address" with a switch-account action. Accept → create OrgMember (+ KyteMember rows for SELECTED), mark ACCEPTED, bust caches, notify the inviter by email. Decline → DECLINED, no email to the inviter (shown as Declined in the Team tab).
4. **Lifecycle:** revoke (OWNER/ADMIN) → REVOKED; expiry sweep → EXPIRED; declined email not re-invitable to that org for 7 days; max one resend per 24h.
5. **Anti-spam:** limits above + `invite-send` rate class ([06-api.md](06-api.md)); report-abuse mailto in every invite email; per-user invite volume surfaced in admin.

## Scheduled publish — snapshots, up to 3 pending

Founder-confirmed semantics: **scheduling freezes the draft into a snapshot.** Multiple pending schedules make release planning real: on the 31st, an artist schedules the *single* design for the 1st **and** the *album* design for the 5th — two snapshots, both queued, done in one sitting.

- Create (MANAGER+): Publish split-button → "Schedule…" → date/time/timezone (browser IANA default; stored UTC + tz for display), ≥5 min out, ≤1 year. Snapshot = full ProfileContent at that moment.
- Up to **3 PENDING** per kyte (limit-modal beyond). The Schedule panel lists pending schedules chronologically — each with a mini preview, time, creator, and Update-snapshot / Reschedule / Cancel actions. Editor banner summarizes: "2 scheduled publishes — next: Fri 12:00 AM EDT".
- Later-firing schedules overwrite earlier ones (it's a timeline, communicated in the panel: "This will replace whatever is live at that time"). Draft edits after scheduling never leak into existing snapshots — "Update snapshot" is explicit.
- Fire: worker sweeps `PENDING AND scheduledFor <= now()` every 30s (DB source of truth; row-locked; idempotent) → snapshot → `PublishedKyte` → normal publish pipeline (**moderation included**) → revalidate + OG refresh → PUBLISHED. Within 60s of target.
- **Serialization:** every publish (manual or scheduled) increments `PublishedKyte.publishSeq` inside the publish transaction; moderation verdicts and revalidation jobs carry the seq they were enqueued for and **no-op if a newer seq exists** — a schedule firing seconds after a manual publish can never clobber it out of order, and stale verdicts never overwrite fresh content.
- **Suspended/banned interplay (founder-confirmed — [10-moderation.md](10-moderation.md)):** SUSPENDED/BANNED kytes are in read-only lockdown — the sweep **skips** their schedules (they stay PENDING). On unsuspend, overdue PENDING schedules are marked CANCELED ("missed while suspended"); future ones fire normally. Schedules on a BANNED kyte are auto-canceled (banned is admin-only reversal).
- Failure: retry ×3 → FAILED + email the scheduler + admin alert. Success email: none (founder-confirmed; in-app state suffices).

## Draft preview links (founder-approved)

Share what a draft will look like before publishing — agencies get client sign-off without screenshots.

- EDITOR+ creates from the editor: `PreviewLink` row (hashed token **+ a generated 6-digit passcode, stored hashed** — both shown once at creation; the copy button copies URL + passcode together), 7-day expiry, revocable, max 5 active per kyte → URL `kytelink.com/preview/{token}`.
- **Previews are never public (founder-confirmed):** the route shows a passcode gate first (same `input-otp` component as auth); only a correct passcode renders the draft (`preview-verify` rate class, [06-api.md](06-api.md)). **Deterministic moderation checks ([10-moderation.md](10-moderation.md)) run at creation** — a hit blocks the link and flags the kyte into the admin queue, so drafts can't become an unmoderated phishing channel.
- Past the gate, the route renders the **draft** via `<ProfileView>` server-side (SSR — never cached/static), `noindex`, with a slim "Draft preview — not live" banner. Invalid/expired/revoked → friendly dead-link page.
- Preview panel in the editor lists active links (created-by, expiry, copy, revoke). Beacons don't fire on preview renders.

## Audit log (founder-confirmed: v1, and mirrored in admin)

`AuditLog` rows (org-scoped, kyte-tagged): publish, schedule create/update/cancel/fire, username change, domain add/remove, member invite/accept/decline/revoke/role-change/remove, kyte create/delete/transfer, preview link create/revoke, email change. Not logged: draft keystrokes (noise). Each row: actor, action, target, human-readable summary, metadata JSON, timestamp.

- **Team tab → Activity**: org OWNER/ADMIN see the org-wide log; a kyte's MANAGERs see that kyte's log. Filterable by kyte/actor/action.
- **Admin app**: global audit view ([13-admin.md](13-admin.md)).
- Writes happen in the same transaction as the action, via one `audit(actor, action, …)` helper — never ad-hoc inserts.

## Multi-kyte / multi-org UX ([11-web.md](11-web.md) implements)

Editor header switcher, progressively disclosed: a user with only their personal org sees a **flat kyte list** + "New Kytelink" — no org tier at all. The two-level Vercel-style view (org section headers → kytes with role badges) appears only once a second org/team exists. "New team" lives quietly at the switcher's bottom (respects the 3-created-orgs cap); joining an 8th non-owned org (10 orgs total) trips the membership cap (limit modal). `/edit` redirects: last-used kyte cookie → first accessible kyte → onboarding. Editing conflicts: last-write-wins autosave + presence hint ("Sarah is editing") via Redis heartbeat + stale-save warning; real-time co-editing is explicitly out of scope v1.

## Emails inventory (via `packages/emails`)

Login code ([05-auth.md](05-auth.md)) · Invite · Invite accepted (to inviter) · Scheduled publish failed (to scheduler) · Kyte suspended (to org OWNERs, [10-moderation.md](10-moderation.md)). React Email, clean per [14-design.md](14-design.md), plain-text fallback, no tracking pixels.

## Migration mapping ([18-migration.md](18-migration.md))

Each legacy user → `User` (same id) + personal `Organization` + `OrgMember(OWNER, ALL)` + `Kyte` (**id = old userId**, orgId = personal org) + `PublishedKyte` + domains re-pointed. No invites/schedules/audit to migrate. R2 prefixes and ClickHouse keys unchanged by construction.
