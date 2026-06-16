import { Module } from "@nestjs/common";
import { InstallationsController } from "./installations.controller";
import { InternalInstallationsController } from "./installations.internal.controller";
import { InstallationsService } from "./installations.service";

/** Spec: docs/03-modules/installations.md */
@Module({
  controllers: [InstallationsController, InternalInstallationsController],
  providers: [InstallationsService],
  exports: [InstallationsService],
})
export class InstallationsModule {}
