import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { prisma as prismaSingleton } from "@nova/database";
import { PRISMA } from "../../prisma/prisma.module";

/**
 * Spec: docs/03-modules/entitlements.md (ADR-011, I-12) — the single authority for tool access.
 * P3 = GRANT-only. SUBSCRIPTION / TRIAL / FREEMIUM + metered quota land with P6 (inbound billing).
 * Resolution is server-side truth; the `Entitlement` row is a materialized read-model.
 */
@Injectable()
export class EntitlementsService {
  constructor(@Inject(PRISMA) private readonly prisma: typeof prismaSingleton) {}

  /**
   * Resolve + materialize access for (agency, tool). Full resolver (P6, I-12):
   * GRANT → SUBSCRIPTION(active|trialing) → FREEMIUM(plan exists) → NONE. Computes expiry + per-meter usage.
   */
  async resolve(agencyId: string, toolId: string) {
    const [activation, sub, tool] = await Promise.all([
      this.prisma.toolActivation.findUnique({ where: { toolId_agencyId: { toolId, agencyId } } }),
      this.prisma.subscription.findUnique({ where: { agencyId_toolId: { agencyId, toolId } } }),
      this.prisma.tool.findUnique({ where: { id: toolId }, include: { plans: true } }),
    ]);

    let access = false;
    let reason: "GRANT" | "TRIAL" | "SUBSCRIPTION" | "FREEMIUM" | "NONE" = "NONE";
    let expiresAt: Date | null = null;

    if (activation?.status === "ACTIVE" && activation.source === "GRANT") {
      access = true;
      reason = "GRANT";
    } else if (sub && (sub.status === "ACTIVE" || sub.status === "TRIALING")) {
      access = true;
      reason = sub.status === "TRIALING" ? "TRIAL" : "SUBSCRIPTION";
      expiresAt = sub.status === "TRIALING" ? sub.trialEndsAt : sub.currentPeriodEnd;
    } else if (tool?.plans.some((p) => p.model === "FREEMIUM" && p.isActive)) {
      access = true;
      reason = "FREEMIUM";
    }

    // Per-meter usage this period (informational quota), when subscribed.
    let quota: Record<string, number> | null = null;
    if (sub) {
      const since = new Date(Date.now() - 30 * 86_400_000);
      const rows = await this.prisma.usageRecord.groupBy({
        by: ["meterId"],
        where: { subscriptionId: sub.id, occurredAt: { gte: since } },
        _sum: { quantity: true },
      });
      if (rows.length > 0) {
        const meters = await this.prisma.meter.findMany({ where: { id: { in: rows.map((r) => r.meterId) } } });
        const keyById = new Map(meters.map((m) => [m.id, m.key]));
        quota = Object.fromEntries(rows.map((r) => [keyById.get(r.meterId) ?? r.meterId, r._sum.quantity ?? 0]));
      }
    }

    await this.prisma.entitlement.upsert({
      where: { agencyId_toolId: { agencyId, toolId } },
      update: { access, reason, expiresAt, quota: quota ?? undefined, computedAt: new Date() },
      create: { agencyId, toolId, access, reason, expiresAt, quota: quota ?? undefined },
    });
    return { agencyId, toolId, access, reason, expiresAt, quota };
  }

  /** Admin comps a tool to an agency (no Stripe). */
  async grant(toolId: string, agencyId: string, actorId?: string) {
    const [tool, agency] = await Promise.all([
      this.prisma.tool.findUnique({ where: { id: toolId } }),
      this.prisma.agency.findUnique({ where: { id: agencyId } }),
    ]);
    if (!tool) throw new NotFoundException(`Tool not found: ${toolId}`);
    if (!agency) throw new NotFoundException(`Agency not found: ${agencyId}`);

    await this.prisma.$transaction(async (tx: any) => {
      await tx.toolActivation.upsert({
        where: { toolId_agencyId: { toolId, agencyId } },
        update: { source: "GRANT", status: "ACTIVE" },
        create: { toolId, agencyId, source: "GRANT", status: "ACTIVE" },
      });
      await tx.entitlement.upsert({
        where: { agencyId_toolId: { agencyId, toolId } },
        update: { access: true, reason: "GRANT", computedAt: new Date() },
        create: { agencyId, toolId, access: true, reason: "GRANT" },
      });
      await tx.auditLog.create({
        data: { actorId: actorId ?? null, action: "tool.grant", targetType: "TOOL", targetId: toolId, metadata: { agencyId } },
      });
    });
    return this.resolve(agencyId, toolId);
  }

  async revokeGrant(toolId: string, agencyId: string, actorId?: string) {
    await this.prisma.$transaction(async (tx: any) => {
      await tx.toolActivation.updateMany({
        where: { toolId, agencyId, source: "GRANT" },
        data: { status: "INACTIVE" },
      });
      await tx.entitlement.upsert({
        where: { agencyId_toolId: { agencyId, toolId } },
        update: { access: false, reason: "NONE", computedAt: new Date() },
        create: { agencyId, toolId, access: false, reason: "NONE" },
      });
      await tx.auditLog.create({
        data: { actorId: actorId ?? null, action: "tool.grant.revoke", targetType: "TOOL", targetId: toolId, metadata: { agencyId } },
      });
    });
    return this.resolve(agencyId, toolId);
  }

  /** All of an agency's tool entitlements (for the agency surface). */
  async listForAgency(agencyId: string) {
    return this.prisma.entitlement.findMany({
      where: { agencyId },
      include: { tool: { select: { id: true, slug: true, name: true, toolType: true, status: true } } },
      orderBy: { computedAt: "desc" },
    });
  }

  /** Grant state per agency for a tool (admin tool-detail grants UI). */
  async listGrants(toolId: string) {
    return this.prisma.toolActivation.findMany({
      where: { toolId, source: "GRANT" },
      select: { agencyId: true, status: true },
    });
  }

  /** For tool backends (integration contract). Resolves by slug. */
  async checkBySlug(toolSlug: string, agencyId: string) {
    const tool = await this.prisma.tool.findUnique({ where: { slug: toolSlug } });
    if (!tool) return { agencyId, toolId: null, access: false, reason: "NONE" };
    return this.resolve(agencyId, tool.id);
  }
}
