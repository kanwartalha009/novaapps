import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { EventEmitterModule } from "@nestjs/event-emitter";

import { PrismaModule } from "./prisma/prisma.module";
import { HealthModule } from "./modules/health/health.module";
import { AuthModule } from "./modules/auth/auth.module";
import { UsersModule } from "./modules/users/users.module";
import { RbacModule } from "./modules/rbac/rbac.module";
import { AgenciesModule } from "./modules/agencies/agencies.module";
import { AppsRegistryModule } from "./modules/apps-registry/apps-registry.module";
import { AvailabilityModule } from "./modules/availability/availability.module";
import { StoresModule } from "./modules/stores/stores.module";
import { InstallationsModule } from "./modules/installations/installations.module";
import { BillingModule } from "./modules/billing/billing.module";
import { CommissionsModule } from "./modules/commissions/commissions.module";
import { PayoutsModule } from "./modules/payouts/payouts.module";
import { WebhooksModule } from "./modules/webhooks/webhooks.module";
import { ToolsRegistryModule } from "./modules/tools-registry/tools-registry.module";
import { EntitlementsModule } from "./modules/entitlements/entitlements.module";
import { ToolEngineModule } from "./modules/tool-engine/tool-engine.module";
import { StoreBridgeModule } from "./modules/store-bridge/store-bridge.module";
import { SubscriptionsModule } from "./modules/subscriptions/subscriptions.module";
import { MeteringModule } from "./modules/metering/metering.module";
import { JobsModule } from "./modules/jobs/jobs.module";

/**
 * Module list mirrors docs/03-modules/ one-to-one.
 * Dependency directions are constrained by docs/01-architecture/architecture.md.
 */
@Module({
  imports: [
    // Load the monorepo root .env (turbo runs apps from their own cwd)
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ["../../.env", ".env"] }),
    EventEmitterModule.forRoot(),
    PrismaModule,
    HealthModule,
    AuthModule,
    UsersModule,
    RbacModule,
    AgenciesModule,
    AppsRegistryModule,
    AvailabilityModule,
    StoresModule,
    InstallationsModule,
    BillingModule,
    CommissionsModule,
    PayoutsModule,
    WebhooksModule,
    ToolsRegistryModule,
    EntitlementsModule,
    ToolEngineModule,
    StoreBridgeModule,
    SubscriptionsModule,
    MeteringModule,
    JobsModule,
  ],
})
export class AppModule {}
