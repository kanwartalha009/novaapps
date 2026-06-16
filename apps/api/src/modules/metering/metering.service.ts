import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { prisma as prismaSingleton } from "@nova/database";
import { PRISMA } from "../../prisma/prisma.module";
import { stripeFetch } from "../../common/stripe";

/**
 * Spec: docs/03-modules/metering.md (ADR-008). Usage → Stripe meter events (idempotent), plus the
 * per-store meter (active Store Bridge connections). Append-only UsageRecord (I-5); Stripe is the
 * billed source of truth, mirrored locally for projected spend.
 */
@Injectable()
export class MeteringService {
  private readonly log = new Logger(MeteringService.name);

  constructor(@Inject(PRISMA) private readonly prisma: typeof prismaSingleton) {}

  /** Report usage for (agency, tool, meterKey). Idempotent on the meter-event id (no double-billing). */
  async reportUsage(toolSlug: string, agencyId: string, meterKey: string, quantity: number, eventId?: string) {
    const tool = await this.prisma.tool.findUnique({ where: { slug: toolSlug } });
    if (!tool) throw new NotFoundException("Tool not found");
    const [sub, meter, agency] = await Promise.all([
      this.prisma.subscription.findUnique({ where: { agencyId_toolId: { agencyId, toolId: tool.id } } }),
      this.prisma.meter.findUnique({ where: { toolId_key: { toolId: tool.id, key: meterKey } } }),
      this.prisma.agency.findUnique({ where: { id: agencyId } }),
    ]);
    if (!sub) throw new BadRequestException("No subscription for this agency/tool");
    if (!meter) throw new NotFoundException(`Unknown meter: ${meterKey}`);

    const id = eventId ?? randomUUID();
    const existing = await this.prisma.usageRecord.findUnique({ where: { stripeMeterEventId: id } });
    if (existing) return existing; // idempotent

    const rec = await this.prisma.usageRecord.create({
      data: { subscriptionId: sub.id, meterId: meter.id, quantity, stripeMeterEventId: id },
    });

    // Best-effort Stripe meter event (Stripe is the billed source of truth).
    try {
      if (process.env.STRIPE_SECRET_KEY && agency?.stripeCustomerId) {
        await stripeFetch("/billing/meter_events", {
          form: {
            event_name: meterKey,
            "payload[value]": String(quantity),
            "payload[stripe_customer_id]": agency.stripeCustomerId,
            identifier: id,
          },
        });
      }
    } catch (e) {
      this.log.warn(`Stripe meter event failed (recorded locally): ${String(e)}`);
    }
    return rec;
  }

  /** Per-store meter: report the count of ACTIVE Store Bridge connections for (agency, tool). */
  async reportPerStore(agencyId: string, toolId: string) {
    const tool = await this.prisma.tool.findUnique({ where: { id: toolId } });
    if (!tool) throw new NotFoundException("Tool not found");
    const count = await this.prisma.storeBridgeConnection.count({
      where: { toolId, status: "ACTIVE", store: { agencyId } },
    });
    return this.reportUsage(tool.slug, agencyId, "active_stores", count);
  }

  /** Projected spend for the current period (base + metered-so-far). Shown before the invoice closes. */
  async projectedSpend(agencyId: string) {
    const subs = await this.prisma.subscription.findMany({
      where: { agencyId, status: { in: ["ACTIVE", "TRIALING"] } },
      include: { tool: { select: { slug: true, name: true } }, toolPlan: { select: { name: true, baseAmount: true, currency: true, perStore: true, perStoreAmount: true } } },
    });
    const out = [];
    for (const s of subs) {
      const since = new Date(Date.now() - 30 * 86_400_000);
      const usage = await this.prisma.usageRecord.aggregate({
        _sum: { quantity: true },
        where: { subscriptionId: s.id, occurredAt: { gte: since } },
      });
      out.push({
        tool: s.tool.slug,
        name: s.tool.name,
        plan: s.toolPlan.name,
        status: s.status,
        currency: s.toolPlan.currency,
        baseAmount: s.toolPlan.baseAmount,
        meteredUnits: usage._sum.quantity ?? 0,
        currentPeriodEnd: s.currentPeriodEnd,
      });
    }
    return out;
  }

  /** Nightly reconcile (local mirror vs Stripe meter aggregation). Stub — discrepancies → audit alert. */
  async reconcile() {
    const records = await this.prisma.usageRecord.count();
    return { ok: true, localUsageRecords: records, note: "Stripe vs local meter reconciliation runs against Stripe's aggregation (P6+ when live)." };
  }

  adminUsage() {
    return this.prisma.usageRecord.findMany({
      take: 200,
      orderBy: { occurredAt: "desc" },
      include: { meter: { select: { key: true, toolId: true } }, subscription: { select: { agencyId: true, toolId: true } } },
    });
  }
}
