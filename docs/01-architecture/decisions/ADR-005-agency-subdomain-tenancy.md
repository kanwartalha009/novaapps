# ADR-005: Agency subdomain multi-tenancy

**Status:** Accepted · 2026-06-10

## Context
Agency dashboard served at `[agency].nova-apps.localhost:3002` locally and `*.domain` in production (single Vercel project, wildcard domain).

## Decision
- One Next.js app serves all tenants. `middleware.ts` extracts the subdomain and rewrites to `/t/[slug]/...` routes; slug is also sent to the API as a header, but **authorization is the API's job**: JWT must carry membership of the agency that owns the slug (invariant I-9).
- Reserved subdomains (`www`, `admin`, `api`, `app`) are rejected at signup.

## Consequences
- New agency = a DB row, zero infra work.
- Local dev works via `*.localhost` browser resolution.
- Per-tenant custom domains are possible later via Vercel Domains API (C2 change, agency module).
