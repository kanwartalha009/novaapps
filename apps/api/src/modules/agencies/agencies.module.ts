import { Module } from "@nestjs/common";
import { AgenciesController, AdminAgenciesController } from "./agencies.controller";
import { AgenciesService } from "./agencies.service";

/** Spec: docs/03-modules/agencies.md */
@Module({
  controllers: [AgenciesController, AdminAgenciesController],
  providers: [AgenciesService],
  exports: [AgenciesService],
})
export class AgenciesModule {}
