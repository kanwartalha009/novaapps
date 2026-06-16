# ADR-001: Turborepo + pnpm workspaces

**Status:** Accepted · 2026-06-10

## Context
Four deployables (1 NestJS, 3 Next.js) share types, validation schemas, and a DB client. Deploy targets are Vercel (frontends) and Railway (API).

## Decision
Single repo managed by Turborepo with pnpm workspaces. Shared code in `packages/*` consumed as workspace deps, transpiled by consumers (`transpilePackages` in Next, ts path build in Nest).

## Consequences
- Vercel has first-class Turborepo support (turbo-ignore, remote cache).
- One lockfile; atomic cross-app changes (C2 contract changes land in one PR).
- Alternative rejected: Nx (heavier, generator-centric); polyrepo (contract drift risk — violates the change-control goal).
