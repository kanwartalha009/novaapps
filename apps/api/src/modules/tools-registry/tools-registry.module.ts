import { Module } from "@nestjs/common";
import { ToolsRegistryController, ToolCatalogController } from "./tools-registry.controller";
import { ToolsRegistryService } from "./tools-registry.service";
import { AvailabilityModule } from "../availability/availability.module";

/** Spec: docs/03-modules/tools-registry.md */
@Module({
  imports: [AvailabilityModule],
  controllers: [ToolsRegistryController, ToolCatalogController],
  providers: [ToolsRegistryService],
  exports: [ToolsRegistryService],
})
export class ToolsRegistryModule {}
