# v1 rebase + cleanup report (2026-06-12)

Audit of both projects, removal of Encore remnants, reconciliation to one model, and the
repeatable process — done. **Verdict: cleanup complete and statically verified; build/typecheck
must be re-run on a Mac** (the sandbox can't compile — macOS-built node_modules, no DB).

## What changed
**Removed (remnants):**
- `apps/app-admin/db/{encore,review-radar,smart-bundles,stock-sentry}/` (per-app schema drafts) — deleted; the whole `apps/app-admin/db/` dir is gone.
- Root `encore-BUILD-PACK.md` / `-DELIVERY-PLAN.md` / `-PREREQUISITES.md` — deleted (byte-identical canonical copies live in `shopify/encore/`).

**Pruned to the single Encore PoC:**
- `packages/shared/src/fixtures.ts` — removed the 3 mock apps (smart-bundles, review-radar, stock-sentry) and all their installations, charges, commissions, payouts, webhook events, agency assignments, tickets, ticket messages, and the keyed engine/db/spec records. Kept Encore + its coherent demo data. Fixed Encore's own stale paths (repo → `kanwartalha009/encore`; schema → `shopify/encore/prisma/schema.prisma`). Brace/bracket balance verified.
- `apps/web/src/lib/catalog.ts` — marketing catalog now lists Encore only.
- `create-app-drawer.tsx`, app-admin feature page, `middleware.ts` — old `apps/app-admin/db/<slug>` path strings → `shopify/<slug>/prisma/schema.prisma`.

**Reconciled the model (standalone-repo canon):**
- `docs/02-modules/engine.md` — v1 amendment: each app is its own repo (`shopify/<slug>`) owning its backend + prisma + migrations; the platform stores metadata only; `apps/app-admin` is the builder/engine console, not the runtime host. Supersedes the monorepo-hosting + per-app-db-in-monorepo decisions.

**Added (the repeatable process):**
- `docs/process/README.md` — the end-to-end 5-stage runbook (Encore = worked example).
- `docs/process/roadmap-to-real.md` — staged plan R0→R4 to make the platform actually execute the process.

## Flags (open)
1. **The platform is a Phase-1 fixtures prototype** — only auth + agency-signup are implemented; all other API services are 8-line stubs; **no DB migrations exist**. The endpoints Encore needs (install-confirm, webhook ingress) are unbuilt (roadmap **R1**). This is the gating reality for "one app end to end."
2. **Compiled `packages/shared/dist/` is stale** — the fixtures edits are in `src`; run `pnpm build` (rebuild `@nova/shared`) so the apps pick them up, then `pnpm typecheck`.
3. **The app-admin / engine UI still implements the old hosting model** — the create-app wizard, per-app feature pages, and subdomain middleware embody "subdomain-hosted backends in the monorepo." Path strings are fixed, but reconciling their UX to standalone-repo is roadmap **R3** (engine), not this cleanup.
4. **Platform migration not generated here** — Prisma can't fetch its engine in the sandbox. Run on a Mac: `cd packages/database && npx prisma migrate dev --name init`.

## Verify on your Mac
```bash
pnpm install
pnpm build           # rebuilds @nova/shared dist from the pruned fixtures
pnpm typecheck       # confirms no broken types after the cleanup
cd packages/database && npx prisma migrate dev --name init   # R0: first platform migration
```

## Next (from roadmap-to-real.md)
R0 platform migration → **R1 catalog & distribution** (build install-confirm + webhook ingress to
`shopify/encore/NOVA-INTEGRATION-CONTRACT.md`, replace fixtures with API) → this unblocks Encore's
end-to-end and lets you repeat the process for the next app.
