import { Inject, Injectable, Logger } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { prisma as prismaSingleton } from "@nova/database";
import { PRISMA } from "../../prisma/prisma.module";
import { isDevBypass } from "../auth/auth.service";
import { InstallationsService } from "../installations/installations.service";
import { BillingService } from "../billing/billing.service";
import { GdprService } from "./gdpr.service";

export interface IngestInput {
  appSlug: string;
  topic: string;
  shopDomain: string;
  webhookId: string;
  payload: unknown;
}

@Injectable()
export class WebhooksService {
  private readonly log = new Logger(WebhooksService.name);

  constructor(
    @Inject(PRISMA) private readonly prisma: typeof prismaSingleton,
    private readonly installations: InstallationsService,
    private readonly billing: BillingService,
    private readonly gdpr: GdprService,
  ) {}

  status() {
    return { module: "webhooks", implemented: true, spec: "docs/03-modules/webhooks.md" };
  }

  /** Route a (possibly replayed) event by topic. Shared by ingest + the FAILED reprocessor. */
  private async routeByTopic(input: IngestInput): Promise<void> {
    if (input.topic === "app/uninstalled") {
      await this.installations.markUninstalled(input.appSlug, input.shopDomain);
    } else if (GdprService.isGdpr(input.topic)) {
      // customers/data_request, customers/redact, shop/redact → compliance handling (shop-keyed).
      await this.gdpr.handle(input.topic, input.shopDomain, input.payload);
    } else {
      // Billing topics (app_subscriptions/update, one-time, refunds) → App revenue ledger.
      await this.billing.recordFromWebhook({
        appSlug: input.appSlug,
        shopDomain: input.shopDomain,
        topic: input.topic,
        webhookId: input.webhookId,
        payload: input.payload,
      });
    }
  }

  /**
   * Store a forwarded Shopify webhook (idempotent by externalId = X-Shopify-Webhook-Id), 200
   * immediately, then route by topic. R1 handles the lifecycle (app/uninstalled); billing
   * (app_subscriptions/update) + GDPR land in R2+ — recorded as events until then.
   */
  async ingest(input: IngestInput) {
    if (isDevBypass()) return { received: true, dev: true };

    const externalId = input.webhookId || randomUUID();
    const existing = await this.prisma.webhookEvent.findUnique({ where: { externalId } });
    if (existing) return { received: true, deduped: true, id: existing.id };

    // Never persist raw customer/shop PII from GDPR topics (GO-LIVE-AUDIT P0-2).
    const isGdpr = GdprService.isGdpr(input.topic);
    const event = await this.prisma.webhookEvent.create({
      data: {
        externalId,
        // v2 (F6): app-forwarded Shopify events. Stripe/Store-Bridge ingress set their own source.
        source: "SHOPIFY_APP",
        productType: "APP",
        productSlug: input.appSlug,
        topic: input.topic,
        shopDomain: input.shopDomain,
        payload: (isGdpr ? { redacted: true } : (input.payload ?? {})) as object,
        status: "RECEIVED",
      },
    });

    try {
      await this.routeByTopic(input);
      await this.prisma.webhookEvent.update({
        where: { id: event.id },
        data: { status: "PROCESSED", processedAt: new Date() },
      });
    } catch (err) {
      await this.prisma.webhookEvent.update({
        where: { id: event.id },
        data: { status: "FAILED", error: String(err) },
      });
    }
    return { received: true, id: event.id };
  }

  /**
   * Re-run FAILED webhook events (GO-LIVE-AUDIT P1 — closes the gap where a transient error left an
   * event stuck FAILED with no retry). Idempotent: routing dedupes (charges by externalId, installs
   * by app+store), so replays are safe. Wire to the nightly job; runnable on demand via the admin
   * endpoint. GDPR payloads are redacted at rest, but their handlers are shop-keyed so replay works.
   */
  async reprocessFailed(limit = 100) {
    const failed = await this.prisma.webhookEvent.findMany({
      where: { status: "FAILED", source: "SHOPIFY_APP" },
      orderBy: { createdAt: "asc" },
      take: Math.min(Math.max(limit, 1), 500),
    });
    let recovered = 0;
    let stillFailing = 0;
    for (const ev of failed) {
      try {
        await this.routeByTopic({
          appSlug: ev.productSlug ?? "",
          topic: ev.topic,
          shopDomain: ev.shopDomain ?? "",
          webhookId: ev.externalId,
          payload: ev.payload,
        });
        await this.prisma.webhookEvent.update({
          where: { id: ev.id },
          data: { status: "PROCESSED", processedAt: new Date(), error: null },
        });
        recovered++;
      } catch (err) {
        stillFailing++;
        await this.prisma.webhookEvent.update({
          where: { id: ev.id },
          data: { error: String(err) },
        });
      }
    }
    if (failed.length) this.log.log(`reprocessFailed: recovered ${recovered}, still failing ${stillFailing}`);
    return { processed: failed.length, recovered, stillFailing };
  }
}
