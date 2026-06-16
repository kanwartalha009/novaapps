import {
  Body,
  Controller,
  Post,
  Req,
  UnauthorizedException,
  type RawBodyRequest,
} from "@nestjs/common";
import type { Request } from "express";
import { Public } from "../auth/decorators";
import { verifyNovaSignature } from "../../common/nova-signature";
import { InstallationsService, type ConfirmInstallDto } from "./installations.service";

/** Internal install-confirm callback from app backends → POST /v1/internal/installations/confirm */
@Controller("internal/installations")
export class InternalInstallationsController {
  constructor(private readonly service: InstallationsService) {}

  @Public()
  @Post("confirm")
  async confirm(@Req() req: RawBodyRequest<Request>, @Body() body: ConfirmInstallDto) {
    const ok = verifyNovaSignature(
      req.rawBody,
      req.headers["x-nova-signature"] as string | undefined,
      process.env.NOVA_INSTALL_CONFIRM_SECRET ?? "",
    );
    if (!ok) throw new UnauthorizedException("Invalid X-Nova-Signature");
    return this.service.confirmInstall(body);
  }
}
