# ADR-002: Prisma in a single `packages/database` package

**Status:** Accepted · 2026-06-10

## Context
Postgres on Railway. Schema is consumed only by the API (invariant I-2), but migrations and generated client need a home that isn't an app.

## Decision
`packages/database` owns `schema.prisma`, migrations, seed, and exports a singleton `PrismaClient`. Only `apps/api` may import it (frontends get types via `packages/shared` DTOs, not Prisma types).

## Consequences
- One migration history; no schema drift between apps.
- Frontends stay decoupled from DB shape — API DTOs are the contract.
- Alternative rejected: TypeORM (weaker migrations DX), Drizzle (fine, but Prisma chosen for maturity + Railway docs).
