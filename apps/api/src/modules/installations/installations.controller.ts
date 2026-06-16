import { Controller, Get } from "@nestjs/common";
import { Public } from "../auth/decorators";
import { InstallationsService } from "./installations.service";

@Controller("agencies/me/installations")
export class InstallationsController {
  constructor(private readonly service: InstallationsService) {}

  /** Placeholder — real endpoints per docs/03-modules/installations.md */
  @Public()
  @Get("_status")
  status() {
    return this.service.status();
  }
}
