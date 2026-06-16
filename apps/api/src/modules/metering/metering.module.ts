import { Module } from "@nestjs/common";
import {
  ToolUsageController,
  AgencyUsageController,
  AdminUsageController,
  MeteringInternalController,
} from "./metering.controller";
import { MeteringService } from "./metering.service";

/** Spec: docs/03-modules/metering.md (ADR-008). */
@Module({
  controllers: [ToolUsageController, AgencyUsageController, AdminUsageController, MeteringInternalController],
  providers: [MeteringService],
  exports: [MeteringService],
})
export class MeteringModule {}
