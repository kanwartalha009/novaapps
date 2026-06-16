import { Module } from "@nestjs/common";
import { ToolEngineController, ToolEngineInternalController } from "./tool-engine.controller";
import { ToolEngineService } from "./tool-engine.service";

/** Spec: docs/03-modules/tool-engine.md */
@Module({
  controllers: [ToolEngineController, ToolEngineInternalController],
  providers: [ToolEngineService],
  exports: [ToolEngineService],
})
export class ToolEngineModule {}
