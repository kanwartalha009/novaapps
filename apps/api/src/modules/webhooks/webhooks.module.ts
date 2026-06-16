import { Module } from "@nestjs/common";
import { InstallationsModule } from "../installations/installations.module";
import { BillingModule } from "../billing/billing.module";
import { WebhooksController, WebhooksAdminController } from "./webhooks.controller";
import { WebhooksService } from "./webhooks.service";
import { GdprService } from "./gdpr.service";

/** Spec: docs/03-modules/webhooks.md */
@Module({
  imports: [InstallationsModule, BillingModule],
  controllers: [WebhooksController, WebhooksAdminController],
  providers: [WebhooksService, GdprService],
  exports: [WebhooksService],
})
export class WebhooksModule {}
