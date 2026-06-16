# Ingestor templates

Fill the `{{...}}` from the validated spec. Keep values inside the manifest's allowed set.

## 1. Seeder — App (`seed.<slug>.ts`, merge into `packages/database/prisma/seed.ts`)
```ts
// Idempotent. Run via the platform seed. Values from <slug>-app-spec.md.
const app = await prisma.app.upsert({
  where: { slug: '{{slug}}' },
  update: {},
  create: {
    name: '{{name}}', slug: '{{slug}}', description: '{{one_liner}}',
    status: 'DRAFT', pricingModel: '{{FREE|FREEMIUM|PREMIUM}}',
    // moduleManifest + requiredScopes come from spec §platform-fit
    moduleManifest: {{moduleManifestJson}},
  },
});
for (const p of {{plansArray}}) {
  await prisma.appPlan.upsert({
    where: { appId_name: { appId: app.id, name: p.name } },
    update: {}, create: { appId: app.id, ...p }, // amount(minor), currency, interval, trialDays, shopifyHandle
  });
}
// Availability (ADR-011): PRIVATE allowlist or PUBLIC denylist
await prisma.availability.upsert({
  where: { productType_productId: { productType: 'APP', productId: app.id } },
  update: {}, create: { productType: 'APP', productId: app.id, mode: '{{PRIVATE|PUBLIC}}' },
});
// Commission default (ADR-012): PERCENT|FLAT on AgencyApp/Agency/Setting
```

## 2. Seeder — Tool (`seed.<slug>.ts`)
```ts
const tool = await prisma.tool.upsert({
  where: { slug: '{{slug}}' },
  update: {},
  create: {
    name: '{{name}}', slug: '{{slug}}', description: '{{one_liner}}', status: 'DRAFT',
    toolType: '{{AGENCY|STORE|HYBRID}}', usesStoreBridge: {{bool}},
    requiredScopes: {{scopesArray}}, moduleManifest: {{moduleManifestJson}},
  },
});
for (const p of {{toolPlansArray}}) {                       // model, base amount, interval, trialDays(7)
  const plan = await prisma.toolPlan.upsert({
    where: { toolId_name: { toolId: tool.id, name: p.name } },
    update: {}, create: { toolId: tool.id, ...p },
  });
  for (const m of p.meteredComponents ?? [])                // each → a Meter (Stripe meter id filled at P6)
    await prisma.meter.upsert({ where: { toolId_key: { toolId: tool.id, key: m.key } },
      update: {}, create: { toolId: tool.id, key: m.key, unitLabel: m.unit_label } });
}
await prisma.availability.upsert({
  where: { productType_productId: { productType: 'TOOL', productId: tool.id } },
  update: {}, create: { productType: 'TOOL', productId: tool.id, mode: '{{PRIVATE|PUBLIC}}' },
});
```

> Prototype phase: also add `FX_{{SLUG}}` to `@nova/shared/src/fixtures.ts` mirroring the row above so the Admin/Tool Shell renders it before the API is built. State the exact insertion point.

## 3. `<slug>-DELIVERY-PLAN.md` skeleton
```md
# {{name}} — Delivery Plan
Model: standalone repo + own DB; wired to Nova via the integration contract.
## Phase 0 — Prerequisites & spikes
- Accounts/secrets (see PREREQUISITES). Spikes: {{hard unknowns}}. Exit: spikes resolved.
## Phase 1..N — {{from spec build order}}
Each: scope · exit gate (real evidence) · POST-PHASE AUDIT (07-quality/audit-mechanism.md slice).
## Done = all gates green + final audit; no phase reopens a frozen contract.
```

## 4. `<slug>-PREREQUISITES.md` skeleton
```md
# {{name}} — Prerequisites
- Toolchain: node/npm (apps: --package-manager npm; Shopify CLI), Postgres.
- Accounts: Shopify Partner org {{id}} (apps) · Stripe (tools) · GitHub repo under the org.
- Secrets/env: NOVA_API, X-Nova-Signature secrets; (apps) Shopify client_id/secret; (tools) STRIPE_* + Store Bridge scopes.
- BLOCKING spikes: {{list}}.
```

## 5. Build-pack
Use the Encore build pack (`shopify/encore/encore-BUILD-PACK.md`) as the structural template; populate config/screens(with acceptance)/backend/build-order from spec §5–7. For tools, add: entitlement check points, Store Bridge calls (if any), usage reporting, relayed webhooks.
