import { BadRequestException, ForbiddenException, Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { prisma as prismaSingleton, type SubscriptionStatus } from "@nova/database";
import { PRISMA } from "../../prisma/prisma.module";
import { stripeFetch } from "../../common/stripe";
import { EntitlementsService } from "../entitlements/entitlements.service";

const ts = (unix?: number | null) => (unix ? new Date(unix * 1000) : null);
function mapStatus(s: string): SubscriptionStatus {
  switch (s) {
    case "trialing": return "TRIALING";
    case "active": return "ACTIVE";
    case "past_due": return "PAST_DUE";
    case "canceled":
    case "incomplete_expired":
    case "unpaid": return "CANCELED";
    default: return "INCOMPLETE";
  }
}

/**
 * Spec: docs/03-modules/subscriptions.md (ADR-008, I-6 amended, I-14). Inbound agency billing via
 * Stripe — the single writer to Stripe for subscriptions/prices. Revenue derives ONLY from verified
 * Stripe webhooks; nothing is hand-inserted. Separate tables from App revenue (I-14).
 */
@Injectable()
export class SubscriptionsService {
  private readonly log = new Logger(SubscriptionsService.name);

  constructor(
    @Inject(PRISMA) private readonly prisma: typeof prismaSingleton,
    private readonly entitlements: EntitlementsService,
  ) {}

  private async ensureCustomer(agencyId: string): Promise<string> {
    const agency = await this.prisma.agency.findUnique({ where: { id: agencyId } });
    if (!agency) throw new NotFoundException("Agency not found");
    if (agency.stripeCustomerId) return agency.stripeCustomerId;
    const cust = await stripeFetch<{ id: string }>("/customers", {
      form: { name: agency.name, "metadata[agencyId]": agencyId },
    });
    await this.prisma.agency.update({ where: { id: agencyId }, data: { stripeCustomerId: cust.id } });
    return cust.id;
  }

  private async ensurePrice(plan: { id: string; name: string; baseAmount: number; currency: string; interval: string; stripePriceId: string | null }): Promise<string> {
    if (plan.stripePriceId) return plan.stripePriceId;
    const product = await stripeFetch<{ id: string }>("/products", { form: { name: `Tool plan: ${plan.name}` } });
    const price = await stripeFetch<{ id: string }>("/prices", {
      form: {
        product: product.id,
        currency: plan.currency.toLowerCase(),
        unit_amount: String(plan.baseAmount),
        "recurring[interval]": plan.interval === "ANNUAL" ? "year" : "month",
      },
    });
    await this.prisma.toolPlan.update({ where: { id: plan.id }, data: { stripePriceId: price.id } });
    return price.id;
  }

  /** Self-serve subscribe (7-day trial from the plan). */
  async subscribe(agencyId: string, toolId: string, toolPlanId: string) {
    const plan = await this.prisma.toolPlan.findUnique({ where: { id: toolPlanId } });
    if (!plan || plan.toolId !== toolId) throw new BadRequestException("Plan does not belong to this tool");

    const customerId = await this.ensureCustomer(agencyId);
    const priceId = await this.ensurePrice(plan);
    const stripeSub = await stripeFetch<{ id: string; status: string; trial_end?: number; current_period_end?: number }>(
      "/subscriptions",
      {
        form: {
          customer: customerId,
          "items[0][price]": priceId,
          trial_period_days: String(plan.trialDays || 0),
          "metadata[agencyId]": agencyId,
          "metadata[toolId]": toolId,
        },
      },
    );
    const status = mapStatus(stripeSub.status);
    const sub = await this.prisma.subscription.upsert({
      where: { agencyId_toolId: { agencyId, toolId } },
      update: { toolPlanId, stripeSubscriptionId: stripeSub.id, status, trialEndsAt: ts(stripeSub.trial_end), currentPeriodEnd: ts(stripeSub.current_period_end), canceledAt: null },
      create: { agencyId, toolId, toolPlanId, stripeSubscriptionId: stripeSub.id, status, trialEndsAt: ts(stripeSub.trial_end), currentPeriodEnd: ts(stripeSub.current_period_end) },
    });
    await this.prisma.toolActivation.upsert({
      where: { toolId_agencyId: { toolId, agencyId } },
      update: { source: "SUBSCRIPTION", status: "ACTIVE" },
      create: { toolId, agencyId, source: "SUBSCRIPTION", status: "ACTIVE" },
    });
    await this.entitlements.resolve(agencyId, toolId);
    return sub;
  }

  async cancel(agencyId: string, subscriptionId: string) {
    const sub = await this.prisma.subscription.findFirst({ where: { id: subscriptionId, agencyId } });
    if (!sub) throw new NotFoundException("Subscription not found");
    if (sub.stripeSubscriptionId) await stripeFetch(`/subscriptions/${sub.stripeSubscriptionId}`, { method: "DELETE" });
    const updated = await this.prisma.subscription.update({ where: { id: sub.id }, data: { status: "CANCELED", canceledAt: new Date() } });
    await this.prisma.toolActivation.updateMany({ where: { toolId: sub.toolId, agencyId, source: "SUBSCRIPTION" }, data: { status: "INACTIVE" } });
    await this.entitlements.resolve(agencyId, sub.toolId);
    return updated;
  }

  /** Verified Stripe webhook → derive subscription/invoice state (I-6). Never hand-insert revenue. */
  async handleWebhook(event: { type: string; data: { object: any } }) {
    const obj = event.data.object;
    if (event.type.startsWith("customer.subscription.")) {
      const sub = await this.prisma.subscription.findUnique({ where: { stripeSubscriptionId: obj.id } });
      if (sub) {
        const status = event.type === "customer.subscription.deleted" ? "CANCELED" : mapStatus(obj.status);
        await this.prisma.subscription.update({
          where: { id: sub.id },
          data: { status, trialEndsAt: ts(obj.trial_end), currentPeriodEnd: ts(obj.current_period_end), canceledAt: status === "CANCELED" ? new Date() : sub.canceledAt },
        });
        if (status === "CANCELED" || status === "PAST_DUE") {
          await this.prisma.toolActivation.updateMany({ where: { toolId: sub.toolId, agencyId: sub.agencyId, source: "SUBSCRIPTION" }, data: { status: status === "CANCELED" ? "INACTIVE" : "ACTIVE" } });
        }
        await this.entitlements.resolve(sub.agencyId, sub.toolId);
      }
    } else if (event.type === "invoice.paid" || event.type === "invoice.payment_failed") {
      const sub = obj.subscription ? await this.prisma.subscription.findUnique({ where: { stripeSubscriptionId: obj.subscription } }) : null;
      if (sub) {
        const paid = event.type === "invoice.paid";
        await this.prisma.invoice.upsert({
          where: { stripeInvoiceId: obj.id },
          update: { status: paid ? "PAID" : "OPEN", amount: obj.amount_paid ?? obj.amount_due ?? 0 },
          create: {
            stripeInvoiceId: obj.id, agencyId: sub.agencyId, toolId: sub.toolId,
            amount: obj.amount_paid ?? obj.amount_due ?? 0, currency: (obj.currency ?? "usd").toUpperCase(),
            status: paid ? "PAID" : "OPEN", periodStart: ts(obj.period_start), periodEnd: ts(obj.period_end),
          },
        });
        if (!paid) {
          await this.prisma.subscription.update({ where: { id: sub.id }, data: { status: "PAST_DUE" } });
          await this.entitlements.resolve(sub.agencyId, sub.toolId);
        }
      }
    }
    return { received: true };
  }

  listForAgency(agencyId: string) {
    return this.prisma.subscription.findMany({
      where: { agencyId },
      include: { tool: { select: { slug: true, name: true } }, toolPlan: { select: { name: true, baseAmount: true, currency: true } } },
      orderBy: { createdAt: "desc" },
    });
  }
  listInvoices(agencyId: string) {
    return this.prisma.invoice.findMany({ where: { agencyId }, orderBy: { createdAt: "desc" } });
  }
  adminList() {
    return this.prisma.subscription.findMany({
      include: { agency: { select: { slug: true, name: true } }, tool: { select: { slug: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });
  }
}
