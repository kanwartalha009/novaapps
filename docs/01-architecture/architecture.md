# System Architecture

```
        ┌──────────────────────────────── Vercel ─────────────────────────────────┐
        │ web(3000)   admin(3001)    agency(3002)    app-admin(3003)  tool-admin(3004)
        │ catalog     ADMIN SHELL    AGENCY surface   APP SHELL        TOOL SHELL    │
        │             agencies/apps/  stores/installs  app blueprint    tool blueprint│
        │             tools/payouts   + tool subs       + engine         + bridge cfg │
        └─────────────────────────────┬───────────────────────────────────────────┘
                                       │  HTTPS / JSON (REST, /v1)
                                       ▼
        ┌──────────────────────────────── Railway ────────────────────────────────┐
        │                          apps/api (NestJS)                               │
        │ auth·rbac·agencies·apps-registry·stores·installations                    │
        │ billing·commissions·payouts·webhooks            ← APP money (inbound Shopify)
        │ tools-registry·subscriptions·metering·entitlements·store-bridge·tool-engine← TOOL money (inbound Stripe)
        │                          packages/database (Prisma — platform schema only)│
        │                          PostgreSQL (Railway)                            │
        └──────┬───────────────────────────────────────────────┬───────────────────┘
               ▲                                                ▲
      Shopify webhooks (HMAC):                         Stripe webhooks (verified):
      installs, app_subscriptions/update,              subscription lifecycle,
      app_purchases, uninstalls, GDPR;                 invoice.paid/failed,
      + tool store-events relayed via Store Bridge      meter ingestion acks

   Each App repo ──(X-Nova-Signature)──► /v1/internal/installations/confirm + /v1/webhooks/shopify/:appSlug
   Each Tool repo ─(X-Nova-Signature)──► Store Bridge proxy + /v1/webhooks/store-bridge/:toolSlug
```

## Two product classes (ADR-007)

| | **App** | **Tool** |
|---|---|---|
| Reaches | merchant store (Shopify install) | agency (always) + store (via Store Bridge, optional) |
| Data plane | Shopify OAuth gained at install + webhooks | **Store Bridge** (Nova OAuth offline tokens, GraphQL proxy) |
| Payer | merchant (Shopify Billing) | **agency** (Stripe) |
| Agency money | **earns** commission | **pays** subscription + metered + per-store |
| Availability | `Availability` policy (PRIVATE allowlist / PUBLIC denylist) | same policy |
| Activation | agency installs on a store | admin **grant** or self-serve **subscribe** (trial→premium) |
| Builder shell | App Shell (`app-admin`) | Tool Shell (`tool-admin`) |
| Backend | standalone repo + own DB | standalone repo + own DB |
| Reference impl | **Encore** (`shopify/encore`) | *(to build — the reference Tool)* |

## Two money directions (full diagram: `money-flows.md`)

- **App revenue (inbound from Shopify, outbound to agency):** `billing.Charge` → `commissions.Commission` → `payouts.Payout`. The agency is a *payee*.
- **Tool revenue (inbound from agency):** `subscriptions.Subscription`/`Invoice` + `metering.UsageRecord` (→ Stripe Meters). The agency is a *payer*. `entitlements` reads this to gate access/quota.

Both are append-only ledgers (I-5), webhook-sourced (I-6), integer minor units, snapshotted rates.

## Key decisions (full reasoning in `decisions/`)

- **ADR-001** Turborepo + pnpm workspaces monorepo
- **ADR-002** Prisma ORM, single **platform** `packages/database` package (product repos own their own schemas — reconciled I-3)
- **ADR-003** Pluggable `PayoutProvider` interface (manual → Stripe Connect → PayPal) — *outbound* to agencies
- **ADR-004** Shopify Billing API as the App revenue source; ledger-based money model
- **ADR-005** Subdomain multi-tenancy for the agency app
- **ADR-006** Pluggable support bot
- **ADR-007** Two product classes — Apps and Tools
- **ADR-008** Inbound agency billing via **Stripe** (`subscriptions` + `metering`, Meter objects) — amends I-6
- **ADR-009** **Store Bridge** — Nova OAuth offline tokens + scoped, audited GraphQL Admin proxy
- **ADR-010** Tool Shell + per-tool database (symmetric with App Shell + per-app DB)
- **ADR-011** Unified `Availability` policy + `Entitlement` resolver (apps + tools)
- **ADR-012** Flat **and** percentage commissions

## Backend module dependency graph (allowed directions only)

```
auth ──► users ──► rbac
agencies ──► users
apps-registry ──► (none)
tools-registry ──► (none)
stores ──► agencies
store-bridge ──► stores, tools-registry            (token broker + scoped Admin proxy)
installations ──► apps-registry, stores, agencies(referral)
webhooks ──► installations, billing, store-bridge   (ingress only; app + tool store-events)
billing ──► installations                           (App charge ledger)
commissions ──► billing, agencies                   (derives from App charges; PERCENT|FLAT)
payouts ──► commissions, agencies                   (aggregates; PayoutProvider drivers)
subscriptions ──► tools-registry, agencies          (inbound Stripe; agency = payer)
metering ──► subscriptions, store-bridge            (usage → Stripe Meters)
entitlements ──► subscriptions, tools-registry, agencies   (access + remaining quota authority)
engine ──► apps-registry                            (scaffold App repos)
tool-engine ──► tools-registry                      (scaffold Tool repos)
support ──► apps-registry, installations
```

A module may depend only on modules above it. Reverse imports are forbidden (convention + future ESLint boundary rules). `entitlements` is consumed by surfaces/guards but itself reads only downward — no cycle.

## Scale posture (100+ apps/tools, 1M+ store users)

- **Product-scoped everything:** tickets, webhook events, charges, installs, usage records keyed/indexed by `appId`/`toolId` first — queues, dashboards, metrics shard per product.
- **Cursor pagination on every list endpoint** from day one; no unbounded queries.
- **Store Bridge is rate-limit-aware:** it owns Shopify GraphQL cost budgeting per store and backs off centrally so one tool can't exhaust an agency's store API budget.
- **Append-only money ledgers** (both directions) roll up via materialized views when row counts demand.
- Webhook ingress is enqueue-then-process; ready for BullMQ + partitioned tables (later phase).

## Environments

| Env | API | Frontends | DB | Stripe |
|---|---|---|---|---|
| local | localhost:4000 | localhost:3000–3004 (`*.nova-apps/​nova-platform/​nova-tools.localhost`) | local Postgres or Railway dev | test mode |
| staging | Railway (staging) | Vercel preview | Railway Postgres (staging) | test mode |
| production | Railway | Vercel prod (apex, admin., *., app., tool.) | Railway Postgres | live mode |

## Cross-cutting

- **Validation:** zod schemas in `packages/shared`, used by API (pipes) and frontends.
- **Auth:** JWT access (15m) + rotating refresh (30d), httpOnly cookies, per-surface audience claim (`admin` | `agency` | `app-shell` | `tool-shell`).
- **Webhooks:** raw-body HMAC/verification, idempotency via unique external id, processed async. Shopify (apps), Stripe (tools), and Store-Bridge-relayed store events all land in one verified ingress with a product-class discriminator.
- **Money:** integer minor units + currency code everywhere. Never floats. Both directions.
- **IDs:** cuid via Prisma. External ids (Shopify, Stripe) stored alongside, unique-indexed.
- **Secrets:** per-product credentials encrypted at rest (`APP_ENCRYPTION_KEY`); Store Bridge offline tokens scoped, encrypted, rotatable.
