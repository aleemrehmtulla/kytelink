# 00 — Context: what Kytelink is and why we're rewriting

*Read this if: you're the orchestrator, or you want the "why" behind any spec decision.*

Kytelink (repo `kytelink`, domain `kytelink.com`) is a free, open-source Linktree alternative. A user gets a public page at `kytelink.com/<username>`: avatar, name, bio, social icons, link buttons. They edit in a live-preview editor and hit publish. Extras: custom domains, per-profile SEO overrides, page/link analytics, full-page redirects.

The founder (Aleem, GitHub/Twitter `aleemrehmtulla`) runs the hosted instance; the code is public. Hard constraint throughout: **hosted-only features (AI moderation, admin app, Resend email, Vercel domains) must degrade to zero-config no-ops when self-hosted.** Self-host stack is exactly: Postgres + ClickHouse + Redis + any S3-compatible store + SMTP.

## Why rewrite

1. **Analytics writes kill page loads.** Every profile view does a synchronous Postgres `INSERT` *inside* `getServerSideProps`, plus a synchronous PostHog capture, before the page renders. Link clicks do the same. Analytics tables live in the primary DB and grow forever.
2. **Everything is SSR.** Every view hits the database — already painful at ~25k pages whose links get hit hard, untenable at the scale we're aiming for.
3. **Insecure surface.** Unauthenticated admin endpoint and image-upload-URL endpoint; analytics ingestion accepts arbitrary spoofable profile ids; no rate limiting anywhere.
4. **Phishing abuse.** Spammers impersonate telcos/ISPs (Bell, Rogers observed). Signups have been hard-disabled since May 2025 as a stopgap (`signIn` callback throws). The rewrite's AI moderation is what lets signups reopen.
5. **Single-player only.** One account = one profile. Agencies, teams, and multi-project creators can't use it. The rewrite makes ownership multi-Kytelink and collaborative ([04-organizations.md](04-organizations.md)).
6. **Tech debt.** Chakra v1, next-auth v4, Prisma 4, React 18 with React-17 type packages, `@ts-nocheck` on the editor entry, profile rendering logic triplicated, console.log observability, artificial `setTimeout` delays.

## What the rewrite is NOT

- Not a redesign of the public profile pages — existing profiles must render pixel-equivalent ([01-parity.md](01-parity.md)). (The landing page IS redesigned — [12-landing.md](12-landing.md).)
- Not a billing/monetization project — everything stays free; no plans, no quotas beyond abuse limits.
- Not a backfill of moderation over existing profiles — only new publishes are reviewed in v1.
