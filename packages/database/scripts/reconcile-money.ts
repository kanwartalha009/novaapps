/**
 * Money reconciliation harness (audit-mechanism.md §C) — App revenue ledger.
 * Run: pnpm --filter @nova/database run reconcile   (loads root .env)
 * Exits non-zero if any invariant check fails (CI-friendly).
 *
 * Tool revenue (subscriptions/metering, P6) + Stripe-vs-local reconciliation are added when
 * that ledger exists. App side enforces I-5 (append-only), I-6 (charge-sourced), ADR-012 snapshots.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type Check = { name: string; ok: boolean; detail: string };

async function main() {
  const checks: Check[] = [];
  const add = (name: string, ok: boolean, detail = "") => checks.push({ name, ok, detail });

  // ── App-revenue ledger integrity ──────────────────────────────
  const [chargeAgg, commByStatus] = await Promise.all([
    prisma.charge.aggregate({ _sum: { amount: true }, _count: true }),
    prisma.commission.groupBy({ by: ["status"], _sum: { amount: true }, _count: true }),
  ]);

  const orphanDerived = await prisma.commission.count({
    where: { type: { in: ["EARNED", "REVERSAL"] }, chargeId: null },
  });
  add("EARNED/REVERSAL commissions all link to a charge", orphanDerived === 0, `${orphanDerived} orphan(s)`);

  const adjustWithCharge = await prisma.commission.count({
    where: { type: "ADJUSTMENT", NOT: { chargeId: null } },
  });
  add("ADJUSTMENT commissions have no charge", adjustWithCharge === 0, `${adjustWithCharge} bad`);

  const paidNoPayout = await prisma.commission.count({ where: { status: "PAID", payoutId: null } });
  add("PAID commissions belong to a payout", paidNoPayout === 0, `${paidNoPayout} unlinked`);

  const positiveReversal = await prisma.commission.count({ where: { type: "REVERSAL", amount: { gt: 0 } } });
  add("REVERSAL commissions are negative", positiveReversal === 0, `${positiveReversal} positive`);

  const dupCharge = await prisma.commission.groupBy({
    by: ["chargeId"],
    where: { NOT: { chargeId: null } },
    _count: true,
    having: { chargeId: { _count: { gt: 1 } } },
  });
  add("At most one commission per charge", dupCharge.length === 0, `${dupCharge.length} duplicated`);

  // ── Reporting totals (informational) ──────────────────────────
  const gross = chargeAgg._sum.amount ?? 0;
  const commTotal = commByStatus.reduce((s, g) => s + (g._sum.amount ?? 0), 0);

  // ── Report ────────────────────────────────────────────────────
  console.log("\nNova money reconciliation — App revenue ledger\n" + "─".repeat(50));
  console.log(`charges: ${chargeAgg._count} rows, gross ${gross} (minor units)`);
  for (const g of commByStatus) console.log(`commissions ${g.status}: ${g._count} rows, sum ${g._sum.amount ?? 0}`);
  console.log(`commission net (all statuses): ${commTotal}`);
  console.log("─".repeat(50));
  for (const c of checks) console.log(`${c.ok ? "✅" : "❌"} ${c.name}${c.detail && !c.ok ? ` — ${c.detail}` : ""}`);
  const failed = checks.filter((c) => !c.ok);
  console.log("─".repeat(50));
  console.log(failed.length ? `FAIL — ${failed.length} check(s) failed` : "PASS — all checks green");
  console.log("note: Tool revenue (subscriptions/metering) reconciliation lands with P6.\n");

  await prisma.$disconnect();
  process.exit(failed.length ? 1 : 0);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
