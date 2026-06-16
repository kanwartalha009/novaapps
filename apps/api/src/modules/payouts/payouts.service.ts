import { Injectable } from "@nestjs/common";

@Injectable()
export class PayoutsService {
  status() {
    return { module: "payouts", implemented: false, spec: "docs/03-modules/payouts.md" };
  }
}
