# ADR-007: Two product classes — Apps and Tools

**Status:** Accepted · 2026-06-14 · Class: C3 (new invariant I-11) · Supersedes the implicit "apps-only" assumption throughout v1.

## Context
The platform was built around a single product class: Shopify **Apps** installed on merchant stores, monetized by Shopify Billing, with agencies earning commission. Kanwar wants a second class — **Tools** — that agencies *use* (and optionally point at stores) and *pay for* directly. Tools differ from Apps on four axes: who they reach, how they get store data, who pays, and how the agency relates to the money.

## Decision
Model **App** and **Tool** as two product classes that share one skeleton and differ on four switches:

| Axis | App | Tool |
|---|---|---|
| Reaches | merchant store (install) | agency always; store via Store Bridge (optional) |
| Data plane | Shopify OAuth at install + webhooks | **Store Bridge** (ADR-009) |
| Payer | merchant (Shopify Billing) | agency (Stripe, ADR-008) |
| Agency money | earns commission | pays subscription/metered/per-store |

Both share: a platform **registry row + metadata/credentials**, a **standalone repo + own DB** (ADR-010), a **builder shell**, an **Availability** policy and (for tools) **Entitlements** (ADR-011), the **engine** scaffolding pattern, and the signed **integration contract**.

Product class is **fixed at creation** (I-11). Changing class = re-create.

## Consequences
- New registry (`tools-registry`), shell (`tool-admin`), engine (`tool-engine`), and money modules (`subscriptions`, `metering`) — all parallel to existing App equivalents, no rewrite of App code.
- `WebhookEvent` gains a `source`/`productType` discriminator (F6) so one ingress serves both.
- Reporting must combine two money directions (`money-flows.md`); the agency surface shows **net = earnings − spend**.
- Docs reorganize around the App/Tool symmetry (`05-product/{apps,tools}.md`).
