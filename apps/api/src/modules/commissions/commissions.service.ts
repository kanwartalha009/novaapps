import { Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import type { AdjustCommissionDto } from "@nova/shared";
import { prisma as prismaSingleton, type CommissionStatus } from "@nova/database";
import { PRISMA } from "../../prisma/prisma.module";
import { CHARGE_RECORDED, type ChargeRecordedEvent } from "../billing/billing.service";

/** Banker's rounding (round-half-even) to the nearest minor unit — spec: commissions.md. */
function roundHalfEven(n: number): number {
  const floor = Math.floor(n);
  const diff = n - floor;
  if (diff < 0.5) return floor;
  if (diff > 0.5) return floor + 1;
  return floor % 2 === 0 ? floor : floor + 1; // exactly .5 → toward even
}

/**
 * Spec: docs/03-modules/commissions.md + ADR-012. Commissions derive from App charges (I-6),
 * snapshot their rate model/basis (I-5), and only ever transition status (never rewrite amounts).
 */
@Injectable()
export class CommissionsService {
  private readonly log = new Logger(CommissionsService.name);

  constructor(@Inject(PRISMA) private readonly prisma: typeof prismaSingleton) {}

  private async getSetting<T>(key: string, fallback: T): Promise<T> {
    const row = await this.prisma.setting.findUnique({ where: { key } });
    return (row?.value as T) ?? fallback;
  }

  /** Event-driven derivation. Idempotent on chargeId (unique). */
  @OnEvent(CHARGE_RECORDED)
  async onChargeRecorded(evt: ChargeRecordedEvent) {
    try {
      await this.deriveFromCharge(evt.chargeId);
    } catch (err) {
      this.log.error(`deriveFromCharge(${evt.chargeId}) failed: ${String(err)}`);
    }
  }

  async deriveFromCharge(chargeId: string) {
    const existing = await this.prisma.commission.findUnique({ where: { chargeId } });
    if (existing) return existing; // idempotent

    const charge = await this.prisma.charge.findUnique({
      where: { id: chargeId },
      include: { installation: true },
    });
    if (!charge) throw new NotFoundException(`Charge not found: ${chargeId}`);
    const { installation } = charge;
    const { agencyId, appId } = installation;

    // Rate/model resolution: assignment → agency → platform default.
    const [agencyApp, agency] = await Promise.all([
      this.prisma.agencyApp.findUnique({ where: { agencyId_appId: { agencyId, appId } } }),
      this.prisma.agency.findUnique({ where: { id: agencyId } }),
    ]);
    const model =
      agencyApp?.commissionModel ?? agency?.commissionModel ?? (await this.getSetting<"PERCENT" | "FLAT">("defaultCommissionModel", "PERCENT"));
    const basisMode = (await this.getSetting<string>("commissionBasis", "net")).toLowerCase();

    const feeBps = charge.shopifyFeeBps ?? 0;
    const signedGross = charge.amount; // negative for REFUND
    const signedBasis = basisMode === "net" ? Math.round((signedGross * (10000 - feeBps)) / 10000) : signedGross;
    const isRefund = charge.type === "REFUND";
    const magnitude = Math.abs(signedBasis);

    let rateBps = 0;
    let flatAmount: number | null = null;
    let amount: number;
    if (model === "FLAT") {
      flatAmount =
        agencyApp?.flatAmount ?? agency?.flatAmount ?? (await this.getSetting<number>("defaultFlatAmount", 0));
      amount = flatAmount;
    } else {
      rateBps =
        agencyApp?.rateBps ?? agency?.commissionRateBps ?? (await this.getSetting<number>("defaultCommissionRateBps", 2000));
      amount = roundHalfEven((magnitude * rateBps) / 10000);
    }
    if (isRefund) amount = -Math.abs(amount); // reversal is negative

    // Link a refund's reversal to the original EARNED commission for this installation, if unique.
    let reversesCommissionId: string | null = null;
    if (isRefund) {
      const candidates = await this.prisma.commission.findMany({
        where: {
          type: "EARNED",
          reversedBy: { is: null }, // not already reversed
          charge: { is: { installationId: installation.id } },
        },
        orderBy: { createdAt: "desc" },
        take: 1,
      });
      reversesCommissionId = candidates[0]?.id ?? null;
    }

    const commission = await this.prisma.commission.create({
      data: {
        agencyId,
        chargeId: charge.id,
        type: isRefund ? "REVERSAL" : "EARNED",
        status: "PENDING",
        commissionModel: model,
        basisAmount: signedBasis,
        rateBps,
        flatAmount,
        amount,
        currency: charge.currency,
        reversesCommissionId,
      },
    });
    this.log.log(`Commission ${commission.id} (${commission.type} ${amount} ${charge.currency}) for agency ${agencyId}`);
    return commission;
  }

  /** Status transition only (I-5: never edits amounts). */
  async approve(id: string) {
    const c = await this.prisma.commission.findUnique({ where: { id } });
    if (!c) throw new NotFoundException(`Commission not found: ${id}`);
    if (c.status !== "PENDING") return c;
    return this.prisma.commission.update({ where: { id }, data: { status: "APPROVED" } });
  }

  /** Auto-approve matured PENDING earnings (called by the nightly job). */
  async autoApproveMatured() {
    const days = await this.getSetting<number>("commissionMaturityDays", 30);
    const cutoff = new Date(Date.now() - days * 86_400_000);
    const res = await this.prisma.commission.updateMany({
      where: { status: "PENDING", type: "EARNED", createdAt: { lt: cutoff } },
      data: { status: "APPROVED" },
    });
    return { approved: res.count };
  }

  /** Manual ADJUSTMENT entry (new row, never an edit — I-5). */
  async adjust(dto: AdjustCommissionDto) {
    return this.prisma.commission.create({
      data: {
        agencyId: dto.agencyId,
        chargeId: null,
        type: "ADJUSTMENT",
        status: "PENDING",
        commissionModel: "FLAT",
        basisAmount: 0,
        rateBps: 0,
        flatAmount: dto.amount,
        amount: dto.amount,
        currency: dto.currency,
        reason: dto.reason,
      },
    });
  }

  async list(opts: { take?: number; cursor?: string; agencyId?: string; status?: string } = {}) {
    const take = Math.min(Math.max(opts.take ?? 50, 1), 200);
    const rows = await this.prisma.commission.findMany({
      take: take + 1,
      ...(opts.cursor ? { skip: 1, cursor: { id: opts.cursor } } : {}),
      where: {
        ...(opts.agencyId ? { agencyId: opts.agencyId } : {}),
        ...(opts.status ? { status: opts.status as CommissionStatus } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: {
        agency: { select: { id: true, slug: true, name: true } },
        charge: { include: { installation: { include: { app: true, store: true } } } },
      },
    });
    const hasMore = rows.length > take;
    const page = hasMore ? rows.slice(0, take) : rows;
    return { items: page, nextCursor: hasMore ? page[page.length - 1]!.id : null };
  }

  /** Agency balance: totals by status (pending / approved / paid), net of reversals. */
  async summaryForAgency(agencyId: string) {
    const grouped = await this.prisma.commission.groupBy({
      by: ["status"],
      where: { agencyId },
      _sum: { amount: true },
    });
    const byStatus = Object.fromEntries(grouped.map((g) => [g.status, g._sum.amount ?? 0]));
    return {
      pending: byStatus["PENDING"] ?? 0,
      approved: byStatus["APPROVED"] ?? 0,
      paid: byStatus["PAID"] ?? 0,
      reversed: byStatus["REVERSED"] ?? 0,
    };
  }

  /** CSV statement of an agency's commissions (spec: commissions.md). */
  async statementCsv(agencyId: string): Promise<string> {
    const rows = await this.prisma.commission.findMany({
      where: { agencyId },
      orderBy: { createdAt: "desc" },
      include: { charge: { include: { installation: { include: { app: true, store: true } } } } },
    });
    const header = [
      "id", "createdAt", "type", "status", "model", "app", "store",
      "basisAmount", "rateBps", "flatAmount", "amount", "currency", "reason",
    ];
    const esc = (v: unknown) => {
      const s = v == null ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = rows.map((r) =>
      [
        r.id, r.createdAt.toISOString(), r.type, r.status, r.commissionModel,
        r.charge?.installation.app.slug ?? "", r.charge?.installation.store.shopDomain ?? "",
        r.basisAmount, r.rateBps, r.flatAmount ?? "", r.amount, r.currency, r.reason ?? "",
      ].map(esc).join(","),
    );
    return [header.join(","), ...lines].join("\n");
  }
}
