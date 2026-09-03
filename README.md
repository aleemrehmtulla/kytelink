# Kytelink 🪁

a simple, free, and opensource alternative to Linktree.

## 🚀 Getting Started

#### Cloud Hosted

- Head to [kytelink.com](https://kytelink.com)
- Hit the `Create your Kytelink` button
- Sign up with Google, GitHub, or Email
- Follow the onboarding steps to create your first link

#### Self Hosted

You'll need Node 22+, pnpm, and Docker running.

- Clone the [kytelink repo](https://github.com/aleemrehmtulla/kytelink):

  ```sh
  git clone https://github.com/aleemrehmtulla/kytelink.git
  cd kytelink
  ```

- Run `pnpm i` to install dependencies
- Run `pnpm run setup` to configure everything
- Run `pnpm dev` to start the development server

`pnpm run setup` is a one-shot interactive wizard. It asks which optional services you want (analytics, image uploads, a local email inbox — just press Enter to take the defaults), writes your `.env` with freshly generated secrets, starts the Docker services, applies database migrations, and seeds sample data. Postgres + Redis are the only hard requirements, and the wizard runs those in Docker for you.

Prefer non-interactive? Use `pnpm run setup --all` for everything, or `pnpm run setup --minimal` for just the database layer.

`pnpm dev` starts all four apps:

| App                      | URL                                      |
| ------------------------ | ---------------------------------------- |
| Editor + public profiles | [localhost:3000](http://localhost:3000/) |
| Marketing site           | [localhost:3001](http://localhost:3001/) |
| Admin                    | [localhost:3002](http://localhost:3002/) |
| API                      | [localhost:3003](http://localhost:3003/) |

If you run `pnpm dev` before setting up, it tells you exactly what to do — nothing crashes mysteriously. Optional services turn off gracefully if you skip them; see [SELF-HOSTING.md](https://github.com/aleemrehmtulla/kytelink/blob/main/SELF-HOSTING.md) for per-service setup, every environment variable, and the full capability matrix.

## 📝 Features

- [x] Customizable links and icons
- [x] Over 9 beautiful themes
- [x] Editor with live preview
- [x] Advanced analytic engine
- [x] Org and team support
- [x] Use custom domains for free
- [x] Fully self-hostable and open source
- [x] Blazingly fast using SSR

## 📦 Built With

- [Next.js](https://nextjs.org/) + [React](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Radix UI](https://www.radix-ui.com/)
- [Fastify](https://fastify.dev/)
- [tRPC](https://trpc.io/)
- [Zod](https://zod.dev/)
- [Prisma](https://prisma.io/)
- [PostgreSQL](https://www.postgresql.org/)
- [Redis](https://redis.io/) + [BullMQ](https://bullmq.io/)
- [ClickHouse](https://clickhouse.com/)
- [Better Auth](https://www.better-auth.com/)
- [React Email](https://react.email/)
- [Satori](https://github.com/vercel/satori)
- [Turborepo](https://turbo.build/) + [pnpm](https://pnpm.io/)
- [Docker](https://www.docker.com/), [Caddy](https://caddyserver.com/), and [MinIO](https://min.io/) for self-hosting

<br />

If you have any questions, feel free to reach out to me on [Twitter](https://twitter.com/aleemrehmtulla) 🙉

## 📄 License

MIT — see [LICENSE](https://github.com/aleemrehmtulla/kytelink/blob/main/LICENSE).

<br />

**kytelink is completely free for all features**

**if you end up using it, consider tossing a star ⭐**
