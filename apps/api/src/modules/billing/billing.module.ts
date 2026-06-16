import { Module } from "@nestjs/common";
import { BillingController, AgencyChargesController, AdminMetricsController } from "./billing.controller";
import { BillingService } from "./billing.service";

/** Spec: docs/03-modules/billing.md */
@Module({
  controllers: [BillingController, AgencyChargesController, AdminMetricsController],
  providers: [BillingService],
  exports: [BillingService],
})
export class BillingModule {}
