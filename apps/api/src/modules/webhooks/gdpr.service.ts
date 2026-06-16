import { Inject, Injectable, Logger } from "@nestjs/common";
import { prisma as prismaSingleton } from "@nova/database";
import { PRISMA } from "../../prisma/prisma.module";

/**
 * GDPR/compliance handling for app-forwarded mandatory webhooks (GO-LIVE-AUDIT P0-2).
 *
 * The installed app (e.g. Encore) erases its OWN merchant/customer data. This service handles the
 * platform's obligation for the copies it receives: it never persists raw customer PII (the
 * webhooks module stores a redacted marker), purges recoverable shop data on shop/redact, and scrubs
 * any historically-retained payloads. The append-only financial ledger (Charge/Commission) is
 * retained under an accounting/legitimate-interest basis and holds no customer PII.
 */
const GDPR_TOPICS = new Set(["customers/data_request", "customers/redact", "shop/redact"]);

@Injectable()
export class GdprService {
  private readonly log = new Logger(GdprService.name);

  constructor(@Inject(PRISMA) private readonly prisma: typeof prismaSingleton) {}

  static isGdpr(topic: string): boolean {
    return GDPR_TOPICS.has(topic);
  }

  async handle(topic: string, shopDomain: string | undefined, payload: unknown) {
    switch (topic) {
      case "shop/redact":
        return this.shopRedact(shopDomain);
      case "customers/redact":
        return this.customersRedact(shopDomain);
      case "customers/data_request":
        return this.customersDataRequest(shopDomain);
      default:
        return { handled: false };
    }
  }

  /** shop/redact (48h post-uninstall): drop the offline token + scrub retained payloads for the shop. */
  private async shopRedact(shopDomain?: string) {
    if (!shopDomain) return { handled: false };
    const store = await this.prisma.store.findUnique({ where: { shopDomain } });
    if (store?.accessTokenEnc) {
      await this.prisma.store.update({ where: { id: store.id }, data: { accessTokenEnc: null } });
    }
    const scrubbed = await this.scrubPayloads({ shopDomain });
    this.log.log(`shop/redact ${shopDomain}: token purged, ${scrubbed} payload(s) scrubbed`);
    return { handled: true, scrubbed };
  }

  /** customers/redact: erase that customer's PII we may hold (only ever inside retained payloads). */
  private async customersRedact(shopDomain?: string) {
    if (!shopDomain) return { handled: false };
    const scrubbed = await this.scrubPayloads({
      shopDomain,
      topic: { in: ["customers/redact", "customers/data_request"] },
    });
    this.log.log(`customers/redact ${shopDomain}: ${scrubbed} payload(s) scrubbed`);
    return { handled: true, scrubbed };
  }

  /** customers/data_request: the platform is not the controller and retains no customer PII. */
  private async customersDataRequest(shopDomain?: string) {
    this.log.log(`customers/data_request ${shopDomain ?? "?"}: no platform-held customer PII`);
    return { handled: true, held: "none" };
  }

  private async scrubPayloads(where: { shopDomain: string; topic?: { in: string[] } }): Promise<number> {
    const res = await this.prisma.webhookEvent.updateMany({
      where,
      data: { payload: { redacted: true, redactedAt: new Date().toISOString() } },
    });
    return res.count;
  }
}
