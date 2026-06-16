# Deployment

## Topology

| Service | Platform | Build | Notes |
|---|---|---|---|
| `apps/api` | Railway | Nixpacks/Dockerfile, `pnpm turbo build --filter=api` | `railway.json` in app dir; runs `prisma migrate deploy` on release |
| Postgres | Railway | managed | one instance per env |
| `apps/web` | Vercel | root dir `apps/web` | apex domain |
| `apps/admin` | Vercel | root dir `apps/admin` | `admin.<domain>` |
| `apps/agency` | Vercel | root dir `apps/agency` | wildcard `*.<domain>` assigned to this project |

## Vercel monorepo setup (per app)

- Create 3 Vercel projects from the same repo; set **Root Directory** to `apps/web`, `apps/admin`, `apps/agency` respectively.
- Vercel auto-detects Turborepo; build command `turbo build` scoped by root dir. `vercel.json` in each app pins framework + install command.
- Skip unaffected builds: each app's `vercel.json` uses `turbo-ignore` so a commit touching only the API doesn't rebuild frontends.
- Domains: apex → web, `admin.` → admin, `*.` → agency. Wildcard requires the domain to use Vercel nameservers.

## Railway setup (API)

- Service root: repo; config `apps/api/railway.json` (build: `pnpm install --frozen-lockfile && pnpm turbo build --filter=api...`; start: `node apps/api/dist/main.js`).
- Pre-deploy: `pnpm --filter @nova/database prisma migrate deploy`.
- Env vars: `DATABASE_URL` (Railway reference), `JWT_SECRET`, `SHOPIFY_*`, `APP_ENCRYPTION_KEY`, `CORS_ORIGINS`.

## Local dev

```
pnpm install
pnpm db:migrate        # prisma migrate dev
pnpm dev               # turbo: api:4000, web:3000, admin:3001, agency:3002
```

`*.nova-apps.localhost` resolves to 127.0.0.1 in modern browsers without /etc/hosts edits.

## Webhooks in dev

Use `cloudflared`/`ngrok` tunnel pointed at `localhost:4000/webhooks/shopify`; set tunnel URL in the Shopify app config.

## CI gates (Phase 1+)

PR: `turbo lint typecheck test build` (remote caching). Migrations: never edit applied migrations; additive first, destructive in a follow-up release.
