import { Module } from "@nestjs/common";
import { BillingModule } from "../billing/billing.module";
import { CommissionsModule } from "../commissions/commissions.module";
import { WebhooksModule } from "../webhooks/webhooks.module";
import { JobsService } from "./jobs.service";

/** In-process scheduled maintenance jobs (spec: GO-LIVE-AUDIT P1/P2 + billing reconciliation). */
@Module({
  imports: [BillingModule, CommissionsModule, WebhooksModule],
  providers: [JobsService],
})
export class JobsModule {}
