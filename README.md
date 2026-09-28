# The AI Study Bible

A scripture-first study Bible: a multi-translation reader with highlights, bookmarks, and notes; an AI Scripture Assistant whose substantive claims are grounded in retrieved scripture and approved sources; a public daily devotional; and a Pro plan that raises usage limits without changing answer quality.

Product vocabulary lives in [`CONTEXT.md`](CONTEXT.md); architectural decisions live in [`docs/adr`](docs/adr).

## Stack

- **Runtime:** Cloudflare Workers, provisioned with [Alchemy](https://alchemy.run) (`alchemy.run.ts`)
- **Web:** TanStack Start (React, Vite), Tailwind CSS, installable PWA
- **Data:** D1 (Drizzle), R2, Vectorize, Queues, Durable Objects
- **AI:** OpenRouter through the Vercel AI SDK, with zero data retention
- **Integrations:** Stripe (billing), Cloudflare Email Service (email), Web Push, Sentry, PostHog

## Layout

| Path | Contents |
| --- | --- |
| `apps/www` | Web Worker: routes, server functions, service worker |
| `apps/workers` | Background Worker (queues, crons, Durable Objects) and Stripe webhook Worker |
| `packages/core` | Database schema, auth, env bindings, Stripe, email, storage, Bible import |
| `packages/ai` | Assistant chat chain, tools, retrieval, devotional generation |
| `packages/email` | Email templates |
| `packages/schemas` | Shared zod schemas |
| `tools/scripts` | Operational CLI |
| `infra` | Alchemy resources and the GitHub Actions configuration app |
| `migrations/d1` | D1 migrations, applied by Alchemy on deploy |

## Development

Prerequisites: Node.js 22 (pinned in `mise.toml`; Alchemy's Cloudflare client breaks on Node 26), pnpm 11, and a Cloudflare account on the Workers Paid plan (Queues and Email Service sending require it).

```sh
pnpm install
cp .env.example .env   # fill in values; see the comments for each group
pnpm dev               # alchemy dev: local Workers; Vectorize runs against your account
```

Authenticate Alchemy with `pnpm exec alchemy login` or by setting `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.

Checks run in CI before every deploy:

```sh
pnpm type-check
pnpm lint
pnpm format:check
pnpm test
```

Schema changes: edit `packages/core/src/database/schema.ts`, then run `pnpm db:generate` to add a forward migration under `migrations/d1`.

## Deployment

Every external resource is declared in Alchemy: Cloudflare Workers, D1, R2, Vectorize, Queues, Durable Objects, custom domains, and the Stripe Pro product, prices and webhook endpoint (`alchemy.run.ts`); the zone-wide Email Service sending domain and Email Routing, which forwards every `@theaistudybible.com` address to the maintainer (`infra/zone.run.ts`, deployed once with `--stage production`); and the GitHub Actions environments, secrets and scoped Cloudflare deploy tokens (`infra/github.run.ts`). State lives in the `theaistudybible-alchemy-state` Cloudflare worker.

| Stage | Web | Stripe webhook | Deployed by |
| --- | --- | --- | --- |
| `production` | `theaistudybible.com` (media: `media.theaistudybible.com`) | `webhooks.theaistudybible.com/stripe` | `deploy.yml`, after staging passes |
| `staging` | `staging.theaistudybible.com` | `webhooks.staging.theaistudybible.com/stripe` | `deploy.yml`, on every push to `main` |
| `pr-<n>` | `pr-<n>.preview.theaistudybible.com` | `webhooks.pr-<n>.preview.theaistudybible.com/stripe` | `pr-preview-deploy.yml`, removed on close |
| anything else | `*.workers.dev` | none (`WEB_APP_URL` and `STRIPE_WEBHOOK_SECRET` come from the env file) | by hand |

Operator values live in gitignored, per-environment files (`.env.production`, `.env.staging`; previews reuse the staging file) with the variables listed in `.env.example`. Push them to GitHub, which also mints each environment's Cloudflare deploy token:

```sh
pnpm exec alchemy deploy infra/github.run.ts --stage production --env-file .env.production
pnpm exec alchemy deploy infra/github.run.ts --stage staging --env-file .env.staging
pnpm exec alchemy deploy infra/github.run.ts --stage preview --env-file .env.staging
```

Variables left blank in the file are skipped, so a secret set directly with `gh secret set <NAME> --env <environment>` is kept. The post-deploy Cypress smoke tests sign in as `TEST_USER_EMAIL`, an ordinary Account that must already exist in that stage's database.

Deploy a stage by hand with `pnpm exec alchemy deploy alchemy.run.ts --stage <stage> --env-file <file>`. The operator's `CLOUDFLARE_API_TOKEN` needs Account API Tokens Write, Email Sending Write, Email Routing Addresses Write and Email Routing Rules Write in addition to the deploy permissions.

Grant the first production administrator to an existing Account:

```sh
pnpm scripts users promote-admin --stage production --database <d1-name-or-uuid> \
  --email <email> --confirm "PROMOTE <email>"
```

Add a Bible by uploading its Digital Bible Library zip at `/admin/bible`. The background worker imports it through the `bible-import` queue (archive, then one message per book, then one per chapter), which takes a few minutes. A message that still fails after five retries is dead-lettered and summarized by email to administrators. Check progress with:

```sh
wrangler d1 execute <d1-name> --remote --command \
  "select abbreviation, ready_for_publication, (select count(*) from chapters c where c.bible_abbreviation = b.abbreviation) chapters, (select count(*) from verses v where v.bible_abbreviation = b.abbreviation) verses from bibles b"
```

Imported Bibles stay hidden from Readers until `bibles.ready_for_publication` is set to `1`.
