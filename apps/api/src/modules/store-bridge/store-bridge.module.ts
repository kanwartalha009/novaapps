import { Module } from "@nestjs/common";
import {
  AdminBridgeController,
  AgencyBridgeController,
  BridgePublicController,
  BridgeWebhookController,
} from "./store-bridge.controller";
import { StoreBridgeService } from "./store-bridge.service";
import { EntitlementsModule } from "../entitlements/entitlements.module";

/** Spec: docs/03-modules/store-bridge.md (ADR-009, I-13). */
@Module({
  imports: [EntitlementsModule],
  controllers: [AdminBridgeController, AgencyBridgeController, BridgePublicController, BridgeWebhookController],
  providers: [StoreBridgeService],
  exports: [StoreBridgeService],
})
export class StoreBridgeModule {}
