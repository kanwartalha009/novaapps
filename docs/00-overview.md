# Nova Apps Platform — Overview

A platform for **building, distributing, and monetizing** two classes of product for the Shopify ecosystem, operated through an **agency** channel:

- **Apps** — Shopify App Store apps installed on merchant stores. The **merchant pays** via Shopify Billing; the **agency earns commission** on revenue it referred.
- **Tools** — Nova-native software used **by agencies** (and, via the Store Bridge, acting **on stores**). The **agency pays** Nova (freemium + premium, 7-day trial, metered usage, optional per-store charge when the Store Bridge is used).

> **One sentence:** an App is something an agency *sells to merchants and earns from*; a Tool is something an agency *buys from Nova to do its job*. Same build skeleton, opposite money direction.

## Actors

| Actor | Primary surface | Description |
|---|---|---|
| Platform Admin / Operator | **Admin Shell** | Governs the whole platform: agencies, apps, tools, availability, licensing, payouts. RBAC-controlled. |
| App Developer | **App Shell** | Builds + manages one App's spec, backend wiring, and publish lifecycle. |
| Tool Developer | **Tool Shell** | Builds + manages one Tool's spec, backend, Store Bridge usage, and release. |
| Agency | **Agency surface** | Connects stores, installs Apps (earns commission), and subscribes to / is granted Tools (pays or is comped). |
| Merchant (store) | Shopify | Where an App is installed / a Tool acts. Pays App charges via Shopify Billing. |
| Visitor | Web | Marketing site, public catalog, agency signup. |

## The three shells

| Shell | Runtime today | Governs | Spec |
|---|---|---|---|
| **Admin Shell** | `apps/admin` (:3001) | Agencies · Apps · Tools · availability · licensing · payouts · platform settings | `02-shells/admin-shell.md` |
| **App Shell** | `apps/app-admin` (:3003) | One App: blueprint/spec, build-pack export, engine create/deploy, publish checklist | `02-shells/app-shell.md` |
| **Tool Shell** | `apps/tool-admin` (:3004, new) | One Tool: blueprint/spec, backend, Store Bridge config, plans, release | `02-shells/tool-shell.md` |

The Admin Shell is the *marketplace*; App/Tool Shells are *workbenches* for one unit of inventory. Creation of an App or Tool is initiated in the Admin Shell and continues in the relevant workbench shell.

## Surfaces (six)

| Surface | Stack | Port (dev) | Host (dev) | Deploy |
|---|---|---|---|---|
| `apps/api` | NestJS 11 | 4000 | `api.nova-apps.localhost:4000` | Railway |
| `apps/web` | Next.js 15 | 3000 | `nova-apps.localhost:3000` | Vercel |
| `apps/admin` | Next.js 15 | 3001 | `admin.nova-apps.localhost:3001` | Vercel |
| `apps/agency` | Next.js 15 | 3002 | `[agency-slug].nova-apps.localhost:3002` | Vercel (wildcard) |
| `apps/app-admin` (App Shell) | Next.js 15 | 3003 | `[app-slug].nova-platform.localhost:3003` | Vercel/Railway (wildcard) |
| `apps/tool-admin` (Tool Shell) | Next.js 15 | 3004 | `[tool-slug].nova-tools.localhost:3004` | Vercel/Railway (wildcard) |

> App and Tool **backends are NOT these surfaces.** Each App/Tool is its own repo with its own database and deploy (standalone-repo model, ADR-010 / engine). The Shell is the platform-side *builder/console*; the platform DB stores **metadata + credentials only** (ADR-002, reconciled I-3).

## Two money directions

```
APPS  (merchant → platform → agency)            TOOLS (agency → platform)
  Shopify Billing charge                           Stripe subscription / meter
        │ webhook (HMAC)                                 │ webhook (verified)
        ▼                                                ▼
  billing: Charge ledger                          subscriptions: Subscription + Invoice
        │                                          metering: UsageRecord → Stripe Meter
        ▼                                                │
  commissions: Commission (agency earns)          entitlements: access + remaining quota
        ▼
  payouts: Payout (paid OUT to agency)
```

Both directions are **append-only, webhook-sourced, ledgered, never hand-inserted** (invariants I-5, I-6). Full diagram: `01-architecture/money-flows.md`.

## Core flows

**App lifecycle** (unchanged from v1, now one of two): Admin registers an App → App Shell builds it (engine scaffolds a standalone repo, captures `client_id`) → published to the Shopify App Store → made available to agencies (availability policy) → agency connects stores and installs (referral attribution locked at install) → merchant charges flow via Shopify Billing → commissions derive → payouts release to the agency.

**Tool lifecycle** (new): Admin registers a Tool (type: agency-use | store-use | hybrid) → Tool Shell builds it (engine scaffolds a standalone repo + per-tool DB; configures Store Bridge scopes if it touches stores) → made available to agencies (availability policy) → agency **activates** it either by **admin grant** or **self-serve subscribe** (7-day trial → premium; metered + per-store usage billed via Stripe) → entitlements gate access and quota at runtime.

## Creation skills (Stage 1 of the runbook, formalized)

| Skill | Input | Output |
|---|---|---|
| **nova-validator-app** | an app idea / rough spec | platform-fit + idea validation + pricing recommendation + risk flags → a **Nova App Spec** |
| **nova-validator-tool** | a tool idea / rough spec | same, tuned for tools (billing model, Store Bridge, availability) → a **Nova Tool Spec** |
| **nova-spec-ingestor** | a validated Nova App/Tool Spec | registry **seeders** (config rows) + a phased **doc structure + delivery plan** ready to execute |

Installable `.skill` bundles + source: `09-skills/`. They read the **Platform Capability Manifest** so "does this work on Nova" is a checkable question, not a guess.

## Document map

- `01-architecture/` — architecture, domain model, money flows, glossary, deployment, design system, ADRs
- `02-shells/` — the three shells + the agency surface
- `03-modules/` — one spec per backend module (the unit of change)
- `04-surfaces/` — one spec per frontend app + the API surface
- `05-product/` — per-product-class lifecycle, licensing, availability (`apps.md`, `tools.md`)
- `06-plan/` — phased delivery plan (improvements-first)
- `07-quality/` — testing strategy + audit mechanism
- `08-research/` — platform research (Shopify, Stripe, store-bridge auth)
- `09-skills/` — the creation skills (source + bundles) + the Platform Capability Manifest
- `audits/` — point-in-time audits (start with `2026-06-14-architecture-overhaul.md`)
- `process/` — the end-to-end repeatable runbook (apps + tools)
- `CHANGE-CONTROL.md` — invariants + how changes are classified and applied
