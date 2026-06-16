import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UnauthorizedException,
  type RawBodyRequest,
} from "@nestjs/common";
import type { Request } from "express";
import { Public, RequirePermissions } from "../auth/decorators";
import { verifyNovaSignature } from "../../common/nova-signature";
import { WebhooksService } from "./webhooks.service";

@Controller("webhooks")
export class WebhooksController {
  constructor(private readonly service: WebhooksService) {}

  @Public()
  @Get("_status")
  status() {
    return this.service.status();
  }

  /**
   * Ingress for forwarded Shopify webhooks from app backends → POST /v1/webhooks/shopify/:appSlug.
   * Verifies X-Nova-Signature (NOVA_INGRESS_HMAC_SECRET); reads topic/shop/id from X-Nova-* +
   * X-Shopify-Webhook-Id headers (NOVA-INTEGRATION-CONTRACT.md). 401 on bad signature.
   */
  @Public()
  @Post("shopify/:appSlug")
  async ingress(
    @Param("appSlug") appSlug: string,
    @Req() req: RawBodyRequest<Request>,
    @Body() body: unknown,
  ) {
    const ok = verifyNovaSignature(
      req.rawBody,
      req.headers["x-nova-signature"] as string | undefined,
      process.env.NOVA_INGRESS_HMAC_SECRET ?? "",
    );
    if (!ok) throw new UnauthorizedException("Invalid X-Nova-Signature");

    return this.service.ingest({
      appSlug,
      topic: (req.headers["x-nova-topic"] as string) ?? "",
      shopDomain: (req.headers["x-nova-shop-domain"] as string) ?? "",
      webhookId: (req.headers["x-shopify-webhook-id"] as string) ?? "",
      payload: body,
    });
  }
}

/** Admin ops for the webhook ledger — RBAC-guarded (not @Public). */
@Controller("admin/webhooks")
export class WebhooksAdminController {
  constructor(private readonly service: WebhooksService) {}

  /** Replay FAILED events (transient errors). Idempotent; wire to the nightly job too. */
  @Post("reprocess-failed")
  @RequirePermissions("settings:write")
  reprocessFailed(@Query("limit") limit?: string) {
    return this.service.reprocessFailed(limit ? Number(limit) : undefined);
  }
}
