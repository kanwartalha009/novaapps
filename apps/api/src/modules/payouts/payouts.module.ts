import { Module } from "@nestjs/common";
import { PayoutsController } from "./payouts.controller";
import { PayoutsService } from "./payouts.service";

/** Spec: docs/03-modules/payouts.md */
@Module({
  controllers: [PayoutsController],
  providers: [PayoutsService],
  exports: [PayoutsService],
})
export class PayoutsModule {}
