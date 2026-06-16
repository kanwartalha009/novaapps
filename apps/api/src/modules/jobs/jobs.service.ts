import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from "@nestjs/common";
import { BillingService } from "../billing/billing.service";
import { CommissionsService } from "../commissions/commissions.service";
import { WebhooksService } from "../webhooks/webhooks.service";

const MIN = 60_000;

/**
 * In-process maintenance jobs. The Railway API is always-on, so no external cron service is needed.
 * All three are idempotent, so fixed intervals are safe (no exact-time cron required):
 *   - reprocessFailed      every 15m — retry FAILED webhook events (dedupes on externalId)
 *   - reconcileFromPartner  every 6h — Partner-API true-up (no-ops until creds set; write-guarded by
 *                                      the `billingSourceOfTruth` setting)
 *   - autoApproveMatured    every 6h — mature PENDING→APPROVED past `commissionMaturityDays`
 *
 * Set `JOBS_ENABLED=false` on any extra instance when scaling beyond one, to avoid redundant runs.
 */
@Injectable()
export class JobsService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly log = new Logger(JobsService.name);
  private timers: NodeJS.Timeout[] = [];

  constructor(
    private readonly billing: BillingService,
    private readonly commissions: CommissionsService,
    private readonly webhooks: WebhooksService,
  ) {}

  onApplicationBootstrap() {
    if (process.env.JOBS_ENABLED === "false") {
      this.log.log("JOBS_ENABLED=false — in-process jobs disabled on this instance");
      return;
    }
    this.every(15 * MIN, "reprocessFailed", () => this.webhooks.reprocessFailed(200));
    this.every(6 * 60 * MIN, "reconcileFromPartner", () => this.billing.reconcileFromPartner({}));
    this.every(6 * 60 * MIN, "autoApproveMatured", () => this.commissions.autoApproveMatured());
    this.log.log("In-process jobs scheduled (reprocessFailed 15m; reconcile + autoApprove 6h)");
  }

  onModuleDestroy() {
    for (const t of this.timers) clearInterval(t);
    this.timers = [];
  }

  private every(ms: number, name: string, fn: () => Promise<unknown>) {
    const run = async () => {
      try {
        const r = await fn();
        this.log.debug(`${name}: ${JSON.stringify(r)}`);
      } catch (e) {
        this.log.error(`${name} failed: ${String(e)}`);
      }
    };
    const t = setInterval(run, ms);
    if (typeof t.unref === "function") t.unref(); // don't keep the process alive on shutdown
    this.timers.push(t);
  }
}
