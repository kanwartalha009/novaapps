import { Controller, Get } from "@nestjs/common";
import { Public } from "../auth/decorators";
import { PayoutsService } from "./payouts.service";

@Controller("admin/payouts")
export class PayoutsController {
  constructor(private readonly service: PayoutsService) {}

  /** Placeholder — real endpoints per docs/03-modules/payouts.md */
  @Public()
  @Get("_status")
  status() {
    return this.service.status();
  }
}
