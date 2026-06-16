# App: api (NestJS · Railway · :4000)

- Global prefix `/v1`. Versioned URI if breaking changes ever needed (C2).
- Module folders mirror `docs/03-modules/` one-to-one — that mapping is the unit of change.
- Global pipes: zod validation (schemas from `@nova/shared`); global guards: JWT + permissions.
- Config via `@nestjs/config` + zod-validated env (`src/config/env.ts`). Missing env fails boot.
- Health: `GET /v1/health` (Railway healthcheck).
- Raw body enabled only on `/webhooks/*` routes.
- Error shape: `{ statusCode, error, message, requestId }`.
