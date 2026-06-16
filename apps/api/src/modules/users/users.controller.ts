import { Controller, Get } from "@nestjs/common";
import { Public } from "../auth/decorators";
import { UsersService } from "./users.service";

@Controller("admin/users")
export class UsersController {
  constructor(private readonly service: UsersService) {}

  /** Placeholder — real endpoints per docs/03-modules/users-rbac.md */
  @Public()
  @Get("_status")
  status() {
    return this.service.status();
  }
}
