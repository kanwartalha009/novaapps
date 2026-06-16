# Surface: tool-admin (Tool Shell) — v2

**Next.js · Vercel/Railway · :3004 · `[tool-slug].nova-tools.<domain>` (wildcard).** Audience: `tool-shell` JWT. New surface (ADR-010).

> Responsibilities, sections, and endpoints: **`02-shells/tool-shell.md`** (canonical). This file covers only frontend mechanics.

- **Middleware:** resolve `[tool-slug]` subdomain → rewrite to internal `/t/[toolSlug]`. JWT audience `tool-shell`; API re-verifies.
- **Data:** all via API (`tools:*`). Scaffold against `FX_*` fixtures first (mirror the app-admin pattern), then replace with API per phase.
- **Sections (routes):** `/t/[toolSlug]` overview · `/specs` blueprint · `/backend` · `/bridge` Store Bridge config · `/plans` (Stripe) · `/export` build-pack · `/release` checklist.
- **Build:** clone the app-admin Next.js scaffold (shared `components/ui`, charts, command-menu); swap App concepts for Tool concepts (type, plans→Stripe, bridge scopes). Shared generator internals live with `engine`/`tool-engine` (F5).
