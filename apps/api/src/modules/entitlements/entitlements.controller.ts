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
import { EntitlementsService } from "./entitlements.service";
import { RequirePermissions, CurrentUser, Public } from "../auth/decorators";
import type { AccessTokenPayload } from "../auth/auth.types";
import { zodParse } from "../../common/zod";
import { verifyNovaSignature } from "../../common/nova-signature";

const grantSchema = z.object({ agencyId: z.string().min(1) });

/** Admin grant/revoke a tool to an agency (comped; no Stripe). Spec: entitlements.md (I-12). */
@Controller("admin/tools")
export class EntitlementsAdminController {
  constructor(private readonly service: EntitlementsService) {}

  @Post(":id/grant")
  @RequirePermissions("tools:grant")
  grant(@Param("id") toolId: string, @Body() body: unknown, @CurrentUser() user: AccessTokenPayload) {
    const { agencyId } = zodParse(grantSchema, body);
    return this.service.grant(toolId, agencyId, user?.sub);
  }

  @Post(":id/grant/:agencyId/revoke")
  @RequirePermissions("tools:grant")
  revoke(@Param("id") toolId: string, @Param("agencyId") agencyId: string, @CurrentUser() user: AccessTokenPayload) {
    return this.service.revokeGrant(toolId, agencyId, user?.sub);
  }

  @Get(":id/grants")
  @RequirePermissions("tools:grant")
  grants(@Param("id") toolId: string) {
    return this.service.listGrants(toolId);
  }
}

/** Agency-scoped entitlements (I-9). */
@Controller("agencies/me/entitlements")
export class AgencyEntitlementsController {
  constructor(private readonly service: EntitlementsService) {}

  @Get()
  list(@CurrentUser() user: AccessTokenPayload) {
    if (!user?.agencyId) throw new ForbiddenException("Agency context required");
    return this.service.listForAgency(user.agencyId);
  }
}

/** Tool-backend check (integration contract; HMAC). Body: { agencyId }. Used from P4 by tool repos. */
@Controller("entitlements")
export class EntitlementsInternalController {
  constructor(private readonly service: EntitlementsService) {}

  @Public()
  @Post(":toolSlug/check")
  async check(
    @Param("toolSlug") toolSlug: string,
    @Req() req: RawBodyRequest<Request>,
    @Body() body: { agencyId?: string },
  ) {
    const ok = verifyNovaSignature(
      req.rawBody,
      req.headers["x-nova-signature"] as string | undefined,
      process.env.NOVA_ENTITLEMENT_SECRET ?? "",
    );
    if (!ok) throw new UnauthorizedException("Invalid X-Nova-Signature");
    if (!body?.agencyId) throw new UnauthorizedException("agencyId required");
    return this.service.checkBySlug(toolSlug, body.agencyId);
  }
}
