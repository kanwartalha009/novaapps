import { Module } from "@nestjs/common";
import { RbacController } from "./rbac.controller";
import { RbacService } from "./rbac.service";

/** Spec: docs/03-modules/users-rbac.md */
@Module({
  controllers: [RbacController],
  providers: [RbacService],
  exports: [RbacService],
})
export class RbacModule {}
