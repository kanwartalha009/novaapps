import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Query,
  Req,
  UnauthorizedException,
  type RawBodyRequest,
} from "@nestjs/common";
import type { Request } from "express";
import { z } from "zod";
import { StoreBridgeService } from "./store-bridge.service";
import { RequirePermissions, CurrentUser, Public } from "../auth/decorators";
import type { AccessTokenPayload } from "../auth/auth.types";
import { zodParse } from "../../common/zod";
import { verifyNovaSignature } from "../../common/nova-signature";

const connectSchema = z.object({ toolId: z.string().min(1), storeId: z.string().min(1) });
const graphqlSchema = z.object({ storeId: z.string().min(1), query: z.string().min(1), variables: z.unknown().optional() });

/** Admin — bridge connections (list + connect + revoke). */
@Controller("admin/bridge")
export class AdminBridgeController {
  constructor(private readonly service: StoreBridgeService) {}

  @Get("connections")
  @RequirePermissions("tools:read")
  list(@Query("toolId") toolId?: string, @Query("storeId") storeId?: string) {
    return this.service.listConnections({ toolId, storeId });
  }

  @Post("connections")
  @RequirePermissions("tools:write")
  connect(@Body() body: unknown, @CurrentUser() user: AccessTokenPayload) {
    const { toolId, storeId } = zodParse(connectSchema, body);
    return this.service.connect(toolId, storeId, user?.sub);
  }

  @Post("connections/:id/revoke")
  @RequirePermissions("tools:write")
  revoke(@Param("id") id: string, @CurrentUser() user: AccessTokenPayload) {
    return this.service.revoke(id, user?.sub);
  }
}

/** Agency — authorize the Store Bridge for one of the agency's stores (OAuth start). */
@Controller("agencies/me/stores")
export class AgencyBridgeController {
  constructor(private readonly service: StoreBridgeService) {}

  @Get(":id/bridge/authorize")
  authorize(@CurrentUser() user: AccessTokenPayload, @Param("id") storeId: string) {
    if (!user?.agencyId) throw new ForbiddenException("Agency context required");
    return this.service.authorizeUrl(user.agencyId, storeId);
  }
}

/** Public — OAuth callback + the scoped GraphQL proxy (tool-signed). */
@Controller("bridge")
export class BridgePublicController {
  constructor(private readonly service: StoreBridgeService) {}

  @Public()
  @Get("oauth/callback")
  callback(@Query("shop") shop: string, @Query("code") code: string, @Query("state") state: string) {
    return this.service.handleCallback(shop, code, state);
  }

  @Public()
  @Post(":toolSlug/graphql")
  graphql(@Param("toolSlug") toolSlug: string, @Req() req: RawBodyRequest<Request>, @Body() body: unknown) {
    const ok = verifyNovaSignature(
      req.rawBody,
      req.headers["x-nova-signature"] as string | undefined,
      process.env.NOVA_BRIDGE_SECRET ?? "",
    );
    if (!ok) throw new UnauthorizedException("Invalid X-Nova-Signature");
    return this.service.proxyGraphql(toolSlug, zodParse(graphqlSchema, body));
  }
}

/** Public — relayed store webhooks for tools (HMAC). */
@Controller("webhooks")
export class BridgeWebhookController {
  constructor(private readonly service: StoreBridgeService) {}

  @Public()
  @Post("store-bridge/:toolSlug")
  relay(@Param("toolSlug") toolSlug: string, @Req() req: RawBodyRequest<Request>, @Body() body: unknown) {
    const ok = verifyNovaSignature(
      req.rawBody,
      req.headers["x-nova-signature"] as string | undefined,
      process.env.NOVA_BRIDGE_SECRET ?? "",
    );
    if (!ok) throw new UnauthorizedException("Invalid X-Nova-Signature");
    return this.service.relayWebhook(toolSlug, {
      topic: (req.headers["x-nova-topic"] as string) ?? "",
      shopDomain: (req.headers["x-nova-shop-domain"] as string) ?? "",
      webhookId: (req.headers["x-shopify-webhook-id"] as string) ?? "",
      payload: body,
    });
  }
}
