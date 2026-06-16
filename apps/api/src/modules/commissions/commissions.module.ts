import { Module } from "@nestjs/common";
import { CommissionsController, AgencyCommissionsController } from "./commissions.controller";
import { CommissionsService } from "./commissions.service";

/** Spec: docs/03-modules/commissions.md. Derives from billing via the charge.recorded event
 *  (global EventEmitter) — no module import of billing needed. */
@Module({
  controllers: [CommissionsController, AgencyCommissionsController],
  providers: [CommissionsService],
  exports: [CommissionsService],
})
export class CommissionsModule {}
