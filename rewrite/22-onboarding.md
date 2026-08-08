# 22 — Auth screens & onboarding flow

*Read this if: you're building the web app's auth/onboarding surfaces. Companion: [05-auth.md](05-auth.md) (mechanics), [04-organizations.md](04-organizations.md) (invited-user path), [14-design.md](14-design.md) (motion/tokens), [15-performance.md](15-performance.md).*

**North star: a brand-new user has a LIVE Kytelink as fast as possible — target under 60 seconds from landing on /signup.** A live page needs only a slug + profile picture. Links come later; never let "I don't have my links ready" stall a publish.

## Auth screens (`/login`, `/signup`) — redesigned

**Layout:** split screen. **Left:** the form — logo, heading, provider buttons, email input; generous whitespace. **Right (≥1024px only):** a showcase panel — soft gradient in brand tokens, a live `<ProfileView>` phone mock cycling themes, one or two short testimonials (write tasteful placeholders — believable name + handle, no real people; the founder swaps in real quotes later, so make them trivially editable in one consts file), subtle floating motion (framer-motion, slow and calm). **Mobile:** form only, full width — no panel.

**Methods, in order:** Continue with Google · Continue with GitHub · **Sign in with a passkey** (login contexts only) · divider · email input → OTP. Small print beneath the form links to `/terms-of-service` and `/privacy-policy` (the real legal pages, [12-landing.md](12-landing.md) — never the legacy PDFs).

**Login ↔ signup morphing (must feel instant, no dead ends):**

- Login and signup are one shared component in two modes; switching modes animates in place (framer-motion layout transition) — no full navigation, state (typed email) carries over.
- Email + OTP: inherently unified — verifying an unknown email creates the account and flows into onboarding; verifying a known one logs in. The user never sees a "no account found" wall on the email path.
- Passkey on an unrecognized device/no credential: fail softly inline — "No passkey found on this device — use Google, GitHub, or email instead." Never a dead-end error page.
- OAuth with an unknown account from `/login`: proceed (account is created — same-email auto-linking makes this safe) and land in onboarding. A returning user hitting `/signup` just gets logged in and routed to their editor.

**Passkeys ([05-auth.md](05-auth.md)):** login-only as an entry point (there's no account to bind at signup). Registration happens (a) via a dismissible one-time nudge after the user's *second* login ("Add a passkey — sign in instantly next time"), shown once, never nagging; (b) anytime in account settings (list, add, rename, remove). Conditional UI (autofill-assisted passkey prompt on the email field) where supported.

## Onboarding wizard (first login, no kyte, no pending invite)

Full-screen, one step visible at a time, animated step transitions (framer-motion slide/fade — sleek, fast, ~200ms), progress dots, `esc`-proof (closing returns here on next login until published).

1. **Claim your slug.** Big single input: `kytelink.com/____` with live availability (debounced, green check / taken → 2–3 suggestions as clickable chips). This is the emotional hook — claiming turf. Reserved-word + format validation inline.
2. **Name + profile picture.** Prefilled aggressively: name from the OAuth provider (or the email local-part, prettified) — editable inline. Avatar: the provider avatar is imported automatically and preselected (server-side fetch → normal asset pipeline [08-media.md](08-media.md)); email-OTP users get an upload tile (with the standard crop/zoom step and real progress %, [08-media.md](08-media.md)) + a set of tasteful default avatars so nobody is blocked on having a photo.
3. **Add links (optional, skippable).** Two paths, side by side. **Import — "Already have a link-in-bio? Bring it over":** paste a Linktree / Beacons / Bio.link URL (deterministic parsers) or any URL (AI extraction — option hidden without `OPENAI_API_KEY`); the server returns a proposal (`import.fromUrl`, [06-api.md](06-api.md)) shown as checkbox rows — links, and name/bio/avatar too when those fields are still empty — that the user confirms into the draft. **Or manual:** up to 3 quick rows (title + URL). Prominent "Skip for now — add links later" — skipping is a first-class path, not a guilt trip.
4. **Publish.** One button: "Go live 🎉". Publishes immediately (moderation pipeline runs as usual), confetti moment, then: your live URL big and copyable, share buttons (the ShareKyteModal set), and "Open editor" CTA. The editor shows a subtle next-steps card (add links, pick a theme, add socials) until each is done once.

Behind the scenes step 4 creates: personal Organization + Kyte + OWNER membership ([04-organizations.md](04-organizations.md)) — the user never hears the word "organization" during onboarding.

**Invited-user path:** signup via an invite link skips the wizard entirely — accept on `/invites` → land in that kyte's editor. If they later want their own page, "New Kytelink" in the switcher reuses wizard steps 1–4.

**Instrumentation:** product events per step (`onboarding_step_{1..4}`, `onboarding_skipped_links`, `links_imported {source, count}`, `signup_to_live_ms`; `signup_completed` carries the watermark `ref` when the landing cookie is present — [07-analytics.md](07-analytics.md)) — the admin funnel's activation stages ([13-admin.md](13-admin.md)).

**Edge cases (all designed, all tested):** slug taken mid-flow (re-check at publish, bounce to step 1 with the taken state); avatar import fails (fall back to upload tile, never block); OTP typo'd email (back-link on the OTP screen to edit the address); browser closed mid-wizard (resume at last incomplete step); invite link opened but signed in with a different email (explicit "sent to a•••@x.com — sign in with that address" state, [04-organizations.md](04-organizations.md)); user deletes their last kyte later (onboarding reuses the existing empty personal org — never a duplicate); import fetch fails or parses empty (friendly "couldn't read that page" + the manual rows remain); moderation suspends the fresh publish (the live-URL screen still shows, page shows suspended shell, owner email per [10-moderation.md](10-moderation.md); the editor thereafter shows the locked suspended state).
