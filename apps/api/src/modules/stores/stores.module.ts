import { Module } from "@nestjs/common";
import { StoresController, AdminStoresController } from "./stores.controller";
import { StoresService } from "./stores.service";

/** Spec: docs/03-modules/stores.md */
@Module({
  controllers: [StoresController, AdminStoresController],
  providers: [StoresService],
  exports: [StoresService],
})
export class StoresModule {}
