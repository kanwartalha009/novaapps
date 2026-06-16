import { Module } from "@nestjs/common";
import {
  AgencySubscriptionsController,
  AdminSubscriptionsController,
  StripeWebhookController,
} from "./subscriptions.controller";
import { SubscriptionsService } from "./subscriptions.service";
import { EntitlementsModule } from "../entitlements/entitlements.module";

/** Spec: docs/03-modules/subscriptions.md (ADR-008). */
@Module({
  imports: [EntitlementsModule],
  controllers: [AgencySubscriptionsController, AdminSubscriptionsController, StripeWebhookController],
  providers: [SubscriptionsService],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
