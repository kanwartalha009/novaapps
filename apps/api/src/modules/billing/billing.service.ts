import { Inject, Injectable, Logger } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { prisma as prismaSingleton } from "@nova/database";
import { PRISMA } from "../../prisma/prisma.module";
import {
  isPartnerConfigured,
  partnerGraphQL,
  partnerMoneyToMinor,
  APP_TRANSACTIONS_QUERY,
} from "../../common/shopify-partner";
import { accrualStopped, subscriptionExternalId, feeBpsFromGrossNet } from "./billing.logic";

/** Emitted after a Charge is persisted; commissions derives from it (billing.md, I-6). */
export const CHARGE_RECORDED = "charge.recorded";
export interface ChargeRecordedEvent { chargeId: string }

type ChargeType = "SUBSCRIPTION" | "ONE_TIME" | "USAGE" | "REFUND";

interface WebhookChargeInput {
  appSlug: string;
  shopDomain: string;
  topic: string;
  webhookId: string;
  payload: any;
}

/**
 * Spec: docs/03-modules/billing.md — the App revenue ledger (I-14: separate from tool revenue).
 * Charges are created ONLY from verified webhooks (I-6) and are idempotent on externalId.
 *
 * NOTE (spike): exact Shopify payload field mapping for amounts/cycle ids must be confirmed against
 * real dev-store webhooks (Encore P0). Parsing here is defensive with documented fallbacks; when no
 * billable amount can be determined the event is recorded as a WebhookEvent (by the webhooks module)
 * but NO Charge is created (avoids phantom revenue).
 */
@Injectable()
export class BillingService {
  private readonly log = new Logger(BillingService.name);

  constructor(
    @Inject(PRISMA) private readonly prisma: typeof prismaSingleton,
    private readonly events: EventEmitter2,
  ) {}

  private typeForTopic(topic: string): ChargeType | null {
    if (topic === "app_subscriptions/update") return "SUBSCRIPTION";
    if (topic === "app_purchases_one_time/update") return "ONE_TIME";
    if (topic.startsWith("refunds/") || topic === "app/refund") return "REFUND";
    return null; // not a billing topic
  }

  /** Major-unit decimal string/number → integer minor units. */
  private toMinor(v: unknown): number | null {
    if (v == null) return null;
    const n = typeof v === "string" ? parseFloat(v) : typeof v === "number" ? v : NaN;
    if (!isFinite(n)) return null;
    return Math.round(n * 100);
  }

  private async getSetting<T>(key: string, fallback: T): Promise<T> {
    const row = await this.prisma.setting.findUnique({ where: { key } });
    return (row?.value as T) ?? fallback;
  }

  /**
   * The app enriches every forwarded billing webhook with `_nova`, derived from an AUTHORITATIVE
   * Shopify Admin API read (currentAppInstallation.activeSubscriptions) at the moment of the event.
   * This is why we never guess an amount from the (amount-less) Shopify webhook payload.
   */
  private readNova(payload: any): {
    subscriptionId: string | null;
    status: string | null;
    amountMinor: number | null;
    currencyCode: string | null;
    currentPeriodEnd: string | null;
  } | null {
    const n = payload?._nova;
    if (!n || typeof n !== "object") return null;
    return {
      subscriptionId: n.subscriptionId ?? null,
      status: n.status ?? null,
      amountMinor: typeof n.amountMinor === "number" ? n.amountMinor : this.toMinor(n.amount),
      currencyCode: n.currencyCode ?? null,
      currentPeriodEnd: n.currentPeriodEnd ?? null,
    };
  }

  /** Legacy/raw fallback amount (minor units) when `_nova` enrichment is absent. */
  private extractAmount(payload: any): number | null {
    const sub = payload?.app_subscription ?? payload?.appSubscription;
    return (
      this.toMinor(payload?.amount) ??
      this.toMinor(payload?.price) ??
      this.toMinor(sub?.amount) ??
      this.toMinor(sub?.line_items?.[0]?.pricing_details?.price?.amount) ??
      null
    );
  }

  private extractCurrency(payload: any): string | null {
    const sub = payload?.app_subscription ?? payload?.appSubscription;
    return payload?.currency ?? payload?.presentment_currency ?? sub?.currency ?? null;
  }

  /**
   * Record a Charge from a verified, forwarded webhook. Idempotent on externalId.
   *
   * For SUBSCRIPTION we ALWAYS sync the installation's subscription mirror first (so cancel/freeze
   * stops accrual), and only create a Charge when the subscription is genuinely ACTIVE — keyed
   * per-cycle (subscriptionId:currentPeriodEnd) so recurring cycles each earn exactly once and a
   * dead/frozen subscription earns nothing (no phantom commissions).
   * Never throws on business misses — those are logged + skipped.
   */
  async recordFromWebhook(input: WebhookChargeInput) {
    const type = this.typeForTopic(input.topic);
    if (!type) return { recorded: false, reason: "not a billing topic" };

    const [app, store] = await Promise.all([
      this.prisma.app.findUnique({ where: { slug: input.appSlug } }),
      this.prisma.store.findUnique({ where: { shopDomain: input.shopDomain } }),
    ]);
    if (!app || !store) return { recorded: false, reason: "unknown app or store" };
    const installation = await this.prisma.installation.findFirst({
      where: { appId: app.id, storeId: store.id },
      include: { appPlan: true },
      orderBy: { createdAt: "desc" },
    });
    if (!installation) return { recorded: false, reason: "no installation" };

    const nova = this.readNova(input.payload);

    // ── Subscription mirror + stop-on-cancel ────────────────────────────────
    if (type === "SUBSCRIPTION" && nova) {
      await this.prisma.installation.update({
        where: { id: installation.id },
        data: {
          subscriptionId: nova.subscriptionId ?? installation.subscriptionId,
          subscriptionStatus: nova.status ?? installation.subscriptionStatus,
          currentPeriodEnd: nova.currentPeriodEnd ? new Date(nova.currentPeriodEnd) : installation.currentPeriodEnd,
        },
      });
      if (accrualStopped(nova.status)) {
        // CANCELLED | EXPIRED | FROZEN | DECLINED | PENDING → not billable; do not accrue.
        return { recorded: false, reason: `subscription ${nova.status!.toLowerCase()} — accrual stopped` };
      }
    }

    // Source-of-truth switch: when Partner-API reconciliation is authoritative, the webhook only
    // maintains the mirror (above) — the Charge is written by reconcileFromPartner (no double count).
    if (type === "SUBSCRIPTION") {
      const sot = await this.getSetting<string>("billingSourceOfTruth", "events");
      if (sot === "partner") return { recorded: false, reason: "deferred to Partner API reconciliation" };
    }

    // Idempotency key — per-cycle for subscriptions (see billing.logic.subscriptionExternalId).
    const externalId = subscriptionExternalId(type, input.payload, nova, input.webhookId);
    if (!externalId) return { recorded: false, reason: "no externalId" };

    const existing = await this.prisma.charge.findUnique({ where: { externalId } });
    if (existing) return { recorded: true, deduped: true, chargeId: existing.id };

    // ── Amount: authoritative `_nova` first, then installed plan price ───────
    let amount = nova?.amountMinor ?? this.extractAmount(input.payload);
    if (amount == null && type === "SUBSCRIPTION") amount = installation.appPlan?.amount ?? null;
    if (amount == null) return { recorded: false, reason: "no billable amount" };
    if (type === "REFUND") amount = -Math.abs(amount);

    const currency =
      nova?.currencyCode ?? this.extractCurrency(input.payload) ?? installation.appPlan?.currency ?? "USD";
    // Net-basis snapshot (ADR-004): Shopify revenue share, configurable until Partner-API actuals land.
    const feeBps = await this.getSetting<number>("shopifyRevShareBps", 0);
    const occurredAt = input.payload?.created_at ? new Date(input.payload.created_at) : new Date();

    const charge = await this.prisma.charge.create({
      data: {
        installationId: installation.id,
        externalId,
        type,
        amount,
        currency,
        shopifyFeeBps: feeBps,
        occurredAt,
      },
    });

    if (type === "SUBSCRIPTION") {
      await this.prisma.installation.update({
        where: { id: installation.id },
        data: { lastChargeAt: occurredAt },
      });
    }

    this.events.emit(CHARGE_RECORDED, { chargeId: charge.id } satisfies ChargeRecordedEvent);
    this.log.log(`Charge ${charge.id} (${type} ${amount} ${currency}) for ${input.appSlug}/${input.shopDomain}`);
    return { recorded: true, chargeId: charge.id };
  }

  private typeForPartner(typename: string): ChargeType | null {
    switch (typename) {
      case "AppSubscriptionSale": return "SUBSCRIPTION";
      case "AppOneTimeSale": return "ONE_TIME";
      case "AppSaleCredit":
      case "AppSaleAdjustment": return "REFUND";
      default: return null;
    }
  }

  /**
   * Reconcile the Charge ledger against the Shopify Partner API — the AUTHORITATIVE record of what
   * Shopify actually collected and will pay out (net of revenue share + processing fees). This is the
   * answer to "are we actually getting paid": charges are written from real payout transactions, not
   * inferred from status webhooks. Idempotent on externalId `partner:<transactionId>`.
   *
   * WRITE-GUARDED: only persists when setting `billingSourceOfTruth` = "partner" (else returns an
   * audit summary), so it never double-counts the event-driven accrual used during the pilot.
   * Wire to the nightly job (alongside commissions.autoApproveMatured) once Partner creds are set.
   */
  async reconcileFromPartner(opts: { sinceISO?: string } = {}) {
    if (!isPartnerConfigured()) return { ok: false, reason: "Partner API not configured" };
    const sot = await this.getSetting<string>("billingSourceOfTruth", "events");
    const write = sot === "partner";
    const appGid = process.env.NOVA_SHOPIFY_APP_GID;
    const createdAtMin = opts.sinceISO ?? new Date(Date.now() - 45 * 86_400_000).toISOString();

    type PartnerTxnPage = {
      transactions: { edges: Array<{ cursor: string; node: any }>; pageInfo: { hasNextPage: boolean } };
    };
    let after: string | null = null;
    let recorded = 0, deduped = 0, skipped = 0, seen = 0;
    do {
      const data: PartnerTxnPage = await partnerGraphQL<PartnerTxnPage>(
        APP_TRANSACTIONS_QUERY,
        { createdAtMin, after },
      );
      const edges = data.transactions?.edges ?? [];
      for (const { node } of edges) {
        seen++;
        if (appGid && node.app?.id && node.app.id !== appGid) { skipped++; continue; }
        const shopDomain = node.shop?.myshopifyDomain;
        const type = this.typeForPartner(node.__typename);
        if (!shopDomain || !type) { skipped++; continue; }
        if (!write) continue; // audit mode
        const res = await this.recordPartnerTransaction(node, shopDomain, type);
        if (res.deduped) deduped++; else if (res.recorded) recorded++; else skipped++;
      }
      after = data.transactions?.pageInfo?.hasNextPage ? (edges[edges.length - 1]?.cursor ?? null) : null;
    } while (after);

    return { ok: true, write, since: createdAtMin, seen, recorded, deduped, skipped };
  }

  private async recordPartnerTransaction(node: any, shopDomain: string, type: ChargeType) {
    const externalId = `partner:${node.id}`;
    const existing = await this.prisma.charge.findUnique({ where: { externalId } });
    if (existing) return { recorded: true, deduped: true, chargeId: existing.id };

    const store = await this.prisma.store.findUnique({ where: { shopDomain } });
    if (!store) return { recorded: false };
    const installation = await this.prisma.installation.findFirst({
      where: { storeId: store.id },
      orderBy: { createdAt: "desc" },
    });
    if (!installation) return { recorded: false };

    const gross = partnerMoneyToMinor(node.grossAmount?.amount);
    const net = partnerMoneyToMinor(node.netAmount?.amount);
    if (gross == null) return { recorded: false };
    let amount = Math.abs(gross);
    if (type === "REFUND") amount = -amount;
    // Net-basis fee snapshot derived from authoritative gross/net (so commissions match the payout).
    const feeBps = feeBpsFromGrossNet(gross, net);
    const currency = node.grossAmount?.currencyCode ?? node.netAmount?.currencyCode ?? "USD";
    const occurredAt = node.createdAt ? new Date(node.createdAt) : new Date();

    const charge = await this.prisma.charge.create({
      data: { installationId: installation.id, externalId, type, amount, currency, shopifyFeeBps: feeBps, occurredAt },
    });
    this.events.emit(CHARGE_RECORDED, { chargeId: charge.id } satisfies ChargeRecordedEvent);
    this.log.log(`Charge ${charge.id} (Partner ${type} ${amount} ${currency}) for ${shopDomain}`);
    return { recorded: true, chargeId: charge.id };
  }

  /** Admin charge ledger (cursor-paginated; optional filters). */
  async list(opts: { take?: number; cursor?: string; appSlug?: string; agencyId?: string } = {}) {
    const take = Math.min(Math.max(opts.take ?? 50, 1), 200);
    const rows = await this.prisma.charge.findMany({
      take: take + 1,
      ...(opts.cursor ? { skip: 1, cursor: { id: opts.cursor } } : {}),
      where: {
        ...(opts.appSlug ? { installation: { app: { slug: opts.appSlug } } } : {}),
        ...(opts.agencyId ? { installation: { agencyId: opts.agencyId } } : {}),
      },
      orderBy: { occurredAt: "desc" },
      include: { installation: { include: { app: true, store: true } } },
    });
    const hasMore = rows.length > take;
    const page = hasMore ? rows.slice(0, take) : rows;
    return { items: page, nextCursor: hasMore ? page[page.length - 1]!.id : null };
  }

  /** Agency-scoped charges (only those attributed to the agency, via installation.agencyId). */
  async listForAgency(agencyId: string, opts: { take?: number; cursor?: string } = {}) {
    return this.list({ ...opts, agencyId });
  }

  /**
   * Admin overview KPIs for the dashboard (reporting aggregate — reads across modules by design,
   * this is a read-only rollup, not a write path). App-side money only (I-14).
   */
  async adminOverview() {
    const since30 = new Date(Date.now() - 30 * 86_400_000);
    const [grossAgg, gross30Agg, posCharges, activeInstalls, pendingAgencies, commGroups] =
      await Promise.all([
        this.prisma.charge.aggregate({ _sum: { amount: true } }),
        this.prisma.charge.aggregate({
          _sum: { amount: true },
          where: { occurredAt: { gte: since30 }, amount: { gt: 0 } },
        }),
        this.prisma.charge.findMany({
          where: { amount: { gt: 0 } },
          include: { installation: { include: { app: true } } },
        }),
        this.prisma.installation.count({ where: { status: "ACTIVE" } }),
        this.prisma.agency.count({ where: { status: "PENDING_APPROVAL" } }),
        this.prisma.commission.groupBy({ by: ["status"], _sum: { amount: true } }),
      ]);

    const byAppMap = new Map<string, { slug: string; name: string; gross: number }>();
    for (const c of posCharges) {
      const app = c.installation.app;
      const e = byAppMap.get(app.slug) ?? { slug: app.slug, name: app.name, gross: 0 };
      e.gross += c.amount;
      byAppMap.set(app.slug, e);
    }
    const comm = Object.fromEntries(commGroups.map((g) => [g.status, g._sum.amount ?? 0]));

    return {
      grossAllTime: grossAgg._sum.amount ?? 0,
      gross30d: gross30Agg._sum.amount ?? 0,
      activeInstalls,
      pendingAgencies,
      byApp: [...byAppMap.values()].sort((a, b) => b.gross - a.gross),
      commissions: {
        pending: comm["PENDING"] ?? 0,
        approved: comm["APPROVED"] ?? 0,
        paid: comm["PAID"] ?? 0,
        reversed: comm["REVERSED"] ?? 0,
      },
    };
  }
}
