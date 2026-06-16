import { Module } from "@nestjs/common";
import {
  EntitlementsAdminController,
  AgencyEntitlementsController,
  EntitlementsInternalController,
} from "./entitlements.controller";
import { EntitlementsService } from "./entitlements.service";

/** Spec: docs/03-modules/entitlements.md (ADR-011, I-12). */
@Module({
  controllers: [EntitlementsAdminController, AgencyEntitlementsController, EntitlementsInternalController],
  providers: [EntitlementsService],
  exports: [EntitlementsService],
})
export class EntitlementsModule {}
