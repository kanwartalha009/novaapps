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
import { SubscriptionsService } from "./subscriptions.service";
import { RequirePermissions, CurrentUser, Public } from "../auth/decorators";
import type { AccessTokenPayload } from "../auth/auth.types";
import { zodParse } from "../../common/zod";
import { verifyStripeSignature } from "../../common/stripe";

const subscribeSchema = z.object({ toolPlanId: z.string().min(1) });

/** Agency self-serve billing (I-9). */
@Controller("agencies/me")
export class AgencySubscriptionsController {
  constructor(private readonly service: SubscriptionsService) {}

  private agencyId(user: AccessTokenPayload): string {
    if (!user?.agencyId) throw new ForbiddenException("Agency context required");
    return user.agencyId;
  }

  @Post("tools/:toolId/subscribe")
  subscribe(@CurrentUser() user: AccessTokenPayload, @Param("toolId") toolId: string, @Body() body: unknown) {
    const { toolPlanId } = zodParse(subscribeSchema, body);
    return this.service.subscribe(this.agencyId(user), toolId, toolPlanId);
  }

  @Post("subscriptions/:id/cancel")
  cancel(@CurrentUser() user: AccessTokenPayload, @Param("id") id: string) {
    return this.service.cancel(this.agencyId(user), id);
  }

  @Get("subscriptions")
  list(@CurrentUser() user: AccessTokenPayload) {
    return this.service.listForAgency(this.agencyId(user));
  }

  @Get("invoices")
  invoices(@CurrentUser() user: AccessTokenPayload) {
    return this.service.listInvoices(this.agencyId(user));
  }
}

/** Admin — tool revenue (subscriptions). */
@Controller("admin/subscriptions")
export class AdminSubscriptionsController {
  constructor(private readonly service: SubscriptionsService) {}

  @Get()
  @RequirePermissions("subscriptions:read")
  list() {
    return this.service.adminList();
  }
}

/** Verified Stripe webhook ingress (I-6 amended). */
@Controller("webhooks")
export class StripeWebhookController {
  constructor(private readonly service: SubscriptionsService) {}

  @Public()
  @Post("stripe")
  async stripe(@Req() req: RawBodyRequest<Request>) {
    const ok = verifyStripeSignature(
      req.rawBody,
      req.headers["stripe-signature"] as string | undefined,
      process.env.STRIPE_WEBHOOK_SECRET ?? "",
    );
    if (!ok) throw new UnauthorizedException("Invalid Stripe signature");
    const event = JSON.parse(req.rawBody!.toString("utf8")) as { type: string; data: { object: any } };
    return this.service.handleWebhook(event);
  }
}
