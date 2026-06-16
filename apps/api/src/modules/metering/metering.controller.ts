import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Req,
  UnauthorizedException,
  type RawBodyRequest,
} from "@nestjs/common";
import type { Request } from "express";
import { z } from "zod";
import { MeteringService } from "./metering.service";
import { RequirePermissions, CurrentUser, Public } from "../auth/decorators";
import type { AccessTokenPayload } from "../auth/auth.types";
import { zodParse } from "../../common/zod";
import { verifyNovaSignature } from "../../common/nova-signature";

const usageSchema = z.object({
  agencyId: z.string().min(1),
  meterKey: z.string().min(1),
  quantity: z.number().int().min(0),
  eventId: z.string().optional(),
});

/** Tool backends report usage (integration contract; HMAC `NOVA_ENTITLEMENT_SECRET`). */
@Controller("tools")
export class ToolUsageController {
  constructor(private readonly service: MeteringService) {}

  @Public()
  @Post(":toolSlug/usage")
  report(@Param("toolSlug") toolSlug: string, @Req() req: RawBodyRequest<Request>, @Body() body: unknown) {
    const ok = verifyNovaSignature(
      req.rawBody,
      req.headers["x-nova-signature"] as string | undefined,
      process.env.NOVA_ENTITLEMENT_SECRET ?? "",
    );
    if (!ok) throw new UnauthorizedException("Invalid X-Nova-Signature");
    const dto = zodParse(usageSchema, body);
    return this.service.reportUsage(toolSlug, dto.agencyId, dto.meterKey, dto.quantity, dto.eventId);
  }
}

/** Agency projected spend. */
@Controller("agencies/me")
export class AgencyUsageController {
  constructor(private readonly service: MeteringService) {}

  @Get("usage")
  usage(@CurrentUser() user: AccessTokenPayload) {
    if (!user?.agencyId) throw new ForbiddenException("Agency context required");
    return this.service.projectedSpend(user.agencyId);
  }
}

/** Admin usage + reconcile. */
@Controller("admin/usage")
export class AdminUsageController {
  constructor(private readonly service: MeteringService) {}

  @Get()
  @RequirePermissions("metering:read")
  list() {
    return this.service.adminUsage();
  }
}

@Controller("internal/metering")
export class MeteringInternalController {
  constructor(private readonly service: MeteringService) {}

  @Public()
  @Post("reconcile")
  reconcile(@Req() req: RawBodyRequest<Request>) {
    const ok = verifyNovaSignature(
      req.rawBody,
      req.headers["x-nova-signature"] as string | undefined,
      process.env.NOVA_ENTITLEMENT_SECRET ?? "",
    );
    if (!ok) throw new UnauthorizedException("Invalid X-Nova-Signature");
    return this.service.reconcile();
  }
}
