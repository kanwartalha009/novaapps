import { Module } from "@nestjs/common";
import {
  AppsRegistryController,
  CatalogController,
  AppPublicController,
} from "./apps-registry.controller";
import { AppsRegistryService } from "./apps-registry.service";
import { AvailabilityModule } from "../availability/availability.module";

/** Spec: docs/03-modules/apps-registry.md */
@Module({
  imports: [AvailabilityModule],
  controllers: [AppsRegistryController, CatalogController, AppPublicController],
  providers: [AppsRegistryService],
  exports: [AppsRegistryService],
})
export class AppsRegistryModule {}
