import { Controller, Get } from "@nestjs/common";
import { Public } from "../auth/decorators";
import { RbacService } from "./rbac.service";

@Controller("admin/roles")
export class RbacController {
  constructor(private readonly service: RbacService) {}

  /** Placeholder — real endpoints per docs/03-modules/users-rbac.md */
  @Public()
  @Get("_status")
  status() {
    return this.service.status();
  }
}
