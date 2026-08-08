# Kytelink

Kytelink is an open-source link-in-bio platform: a public profile page
(`kytelink.com/username`) that bundles your links, an editor with a live
preview, analytics, and org/team support — self-hostable end to end, no
mandatory SaaS.

## Quickstart

Three commands. You need Node 22+, pnpm, and Docker running.

```bash
pnpm i
pnpm run setup
pnpm dev
```

`pnpm run setup` is a one-shot interactive wizard: it asks which optional
services you want (analytics, image uploads, a local email inbox — press
Enter to take the defaults; Postgres + Redis are the only requirement and it
runs those in Docker for you), then writes your `.env` with freshly generated
secrets, starts the Docker services, applies database migrations, and seeds
sample data. Non-interactive: `pnpm run setup --all` (everything) or
`pnpm run setup --minimal` (just the database layer).

`pnpm dev` then starts all four apps: the editor + public profile app on
[localhost:3000](http://localhost:3000), the marketing site on
[localhost:3001](http://localhost:3001), the admin app on
[localhost:3002](http://localhost:3002), and the API on
[localhost:3003](http://localhost:3003). Run `pnpm dev` without setting up
first and it tells you exactly what to do — nothing crashes mysteriously.

## Learn more

- **[SELF-HOSTING.md](./SELF-HOSTING.md)** — the real self-hosting guide:
  per-service setup, every environment variable, and the capability matrix
  (what turns off gracefully if you skip an optional service).
- **[CLAUDE.md](./CLAUDE.md)** — repo tour for AI coding agents (and
  human contributors): `pnpm agents`, port table, agent logins, conventions.
- **[../rewrite/](../rewrite/)** — the full design docs behind this rewrite.

## License

UNLICENSED — see the repo root for status.
