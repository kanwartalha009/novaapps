/**
 * Phase 0 seed: permissions, SUPER_ADMIN role, platform settings.
 * Idempotent — safe to run repeatedly.
 */
import { PrismaClient } from "@prisma/client";
import * as argon2 from "argon2";

const prisma = new PrismaClient();

// Mirrors @nova/shared PERMISSIONS (kept inline to avoid build-order coupling in seed).
const PERMISSIONS = [
  "users:read", "users:write",
  "roles:read", "roles:write",
  "apps:read", "apps:write", "apps:publish",
  "tools:read", "tools:write", "tools:publish", "tools:grant", // v2
  "agencies:read", "agencies:write",
  "stores:read", "stores:write",
  "availability:write", // v2
  "billing:read",
  "commissions:read", "commissions:approve",
  "payouts:read", "payouts:create", "payouts:release",
  "subscriptions:read", "metering:read", // v2
  "support:read", "support:write",
  "settings:write",
];

async function main() {
  for (const key of PERMISSIONS) {
    await prisma.permission.upsert({ where: { key }, update: {}, create: { key } });
  }

  const superAdmin = await prisma.role.upsert({
    where: { name: "SUPER_ADMIN" },
    update: {},
    create: { name: "SUPER_ADMIN", description: "Full access", isSystem: true },
  });

  const perms = await prisma.permission.findMany();
  for (const p of perms) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: superAdmin.id, permissionId: p.id } },
      update: {},
      create: { roleId: superAdmin.id, permissionId: p.id },
    });
  }

  const settings: Record<string, unknown> = {
    defaultCommissionRateBps: 2000,
    defaultCommissionModel: "PERCENT", // 'PERCENT' | 'FLAT' — ADR-012 (v2)
    defaultFlatAmount: 0, // minor units, used when model = FLAT
    commissionBasis: "net", // 'gross' | 'net' — ADR-004 (default NET)
    shopifyRevShareBps: 0, // Shopify app revenue share, snapshot on each Charge for net basis.
    //                        0% on first $1M/yr then 1500 (15%). Reconciled to Partner-API actuals.
    billingSourceOfTruth: "events", // 'events' (verified accrual from ACTIVE webhooks) | 'partner'
    //                                 (authoritative Partner-API reconciliation). Flip to 'partner'
    //                                 once SHOPIFY_PARTNER_* creds are set, to supersede accrual.
    commissionMaturityDays: 30,
    minPayoutAmount: 5000,
    defaultToolTrialDays: 7, // ADR-008 (v2)
  };
  for (const [key, value] of Object.entries(settings)) {
    await prisma.setting.upsert({
      where: { key },
      update: {},
      create: { key, value: value as object },
    });
  }

  // Dev admin user (override via SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD)
  const adminEmail = (process.env.SEED_ADMIN_EMAIL ?? "admin@nova-apps.dev").toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "admin12345";
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: "Platform Admin",
      passwordHash: await argon2.hash(adminPassword),
    },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: admin.id, roleId: superAdmin.id } },
    update: {},
    create: { userId: admin.id, roleId: superAdmin.id },
  });

  // ── R1 demo: register Encore + a dev agency/store + a PENDING install, so the app's
  //    install-confirm callback has a real Installation to flip ACTIVE (closes Encore Phase 0). ──
  const agency = await prisma.agency.upsert({
    where: { slug: "nova" },
    update: {},
    create: { name: "Nova Internal", slug: "nova", status: "ACTIVE" },
  });

  const encore = await prisma.app.upsert({
    where: { slug: "encore" },
    update: {},
    create: {
      name: "Encore",
      slug: "encore",
      description: "Preorder & back-in-stock for EU fashion — per-market, never oversells",
      status: "DRAFT",
      pricingModel: "FREEMIUM",
      shopifyApiKey: "98895e8868ecb5c8555ab43039b554e1",
    },
  });
  // Encore plans — preorder + notify-me monthly limits; annual = 20% off.
  // CRUD these in the Nova admin (POST /v1/admin/apps/:id/plans); Encore reads them
  // from GET /v1/apps/encore/plans.
  for (const p of [
    { name: "Basic", amount: 1999, annualAmount: 19190, trialDays: 14, preorderLimit: 100, notifyLimit: 500 },
    { name: "Growth", amount: 4999, annualAmount: 47990, trialDays: 14, preorderLimit: 1000, notifyLimit: 5000 },
    { name: "Scale", amount: 12999, annualAmount: 124790, trialDays: 0, preorderLimit: null, notifyLimit: null },
  ]) {
    await prisma.appPlan.upsert({
      where: { appId_name: { appId: encore.id, name: p.name } },
      update: {
        amount: p.amount,
        annualAmount: p.annualAmount,
        trialDays: p.trialDays,
        preorderLimit: p.preorderLimit,
        notifyLimit: p.notifyLimit,
        isActive: true,
      },
      create: {
        appId: encore.id,
        name: p.name,
        amount: p.amount,
        annualAmount: p.annualAmount,
        currency: "USD",
        trialDays: p.trialDays,
        preorderLimit: p.preorderLimit,
        notifyLimit: p.notifyLimit,
      },
    });
  }

  const devShop = process.env.DEV_SHOP_DOMAIN ?? "encore-dev.myshopify.com";
  const store = await prisma.store.upsert({
    where: { shopDomain: devShop },
    update: {},
    create: { shopDomain: devShop, name: "Encore Dev Store", agencyId: agency.id },
  });

  const existingInstall = await prisma.installation.findFirst({
    where: { appId: encore.id, storeId: store.id },
  });
  if (!existingInstall) {
    await prisma.installation.create({
      data: { appId: encore.id, storeId: store.id, agencyId: agency.id, status: "PENDING" },
    });
  }

  // Encore availability (v2, ADR-011): PRIVATE allowlist → nova agency allowed.
  const encoreAvail = await prisma.availability.upsert({
    where: { productType_productId: { productType: "APP", productId: encore.id } },
    update: {},
    create: { productType: "APP", productId: encore.id, mode: "PRIVATE" },
  });
  await prisma.availabilityEntry.upsert({
    where: { availabilityId_agencyId: { availabilityId: encoreAvail.id, agencyId: agency.id } },
    update: {},
    create: { availabilityId: encoreAvail.id, agencyId: agency.id, effect: "ALLOW" },
  });

  // ── v2 demo Tool: a HYBRID Store-Bridge tool, granted to the nova agency (proves the P3 path). ──
  const tool = await prisma.tool.upsert({
    where: { slug: "bulk-editor" },
    update: {},
    create: {
      name: "Bulk Editor",
      slug: "bulk-editor",
      description: "Cross-store bulk product/price/metafield editing for agencies",
      status: "DRAFT",
      toolType: "HYBRID",
      usesStoreBridge: true,
      requiredScopes: ["read_products", "write_products"],
    },
  });
  for (const p of [
    { name: "Free", model: "FREEMIUM" as const, baseAmount: 0, perStore: false },
    { name: "Pro", model: "PREMIUM" as const, baseAmount: 4900, perStore: true, perStoreAmount: 500 },
  ]) {
    await prisma.toolPlan.upsert({
      where: { toolId_name: { toolId: tool.id, name: p.name } },
      update: {},
      create: { toolId: tool.id, currency: "USD", trialDays: 7, ...p },
    });
  }
  await prisma.meter.upsert({
    where: { toolId_key: { toolId: tool.id, key: "api_calls" } },
    update: {},
    create: { toolId: tool.id, key: "api_calls", unitLabel: "calls" },
  });
  await prisma.availability.upsert({
    where: { productType_productId: { productType: "TOOL", productId: tool.id } },
    update: {},
    create: { productType: "TOOL", productId: tool.id, mode: "PUBLIC" }, // available to all
  });
  await prisma.toolActivation.upsert({
    where: { toolId_agencyId: { toolId: tool.id, agencyId: agency.id } },
    update: {},
    create: { toolId: tool.id, agencyId: agency.id, source: "GRANT", status: "ACTIVE" },
  });
  await prisma.entitlement.upsert({
    where: { agencyId_toolId: { agencyId: agency.id, toolId: tool.id } },
    update: {},
    create: { agencyId: agency.id, toolId: tool.id, access: true, reason: "GRANT" },
  });

  console.log(
    `Seed complete: permissions, SUPER_ADMIN, settings, admin user (${adminEmail}); ` +
      `Encore demo (app=encore, agency=nova, store=${devShop}, install=PENDING); ` +
      `v2 demo (tool=bulk-editor PUBLIC, granted to nova).`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
