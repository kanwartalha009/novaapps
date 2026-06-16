import { Body, Controller, ForbiddenException, Get, Post, Query } from "@nestjs/common";
import { BillingService } from "./billing.service";
import { RequirePermissions, CurrentUser } from "../auth/decorators";
import type { AccessTokenPayload } from "../auth/auth.types";

/** Admin charge ledger (read-only — charges are webhook-sourced, I-6). */
@Controller("admin/charges")
export class BillingController {
  constructor(private readonly service: BillingService) {}

  @Get()
  @RequirePermissions("billing:read")
  list(
    @Query("take") take?: string,
    @Query("cursor") cursor?: string,
    @Query("appSlug") appSlug?: string,
    @Query("agencyId") agencyId?: string,
  ) {
    return this.service.list({ take: take ? Number(take) : undefined, cursor, appSlug, agencyId });
  }

  /**
   * Reconcile the ledger against the Shopify Partner API (authoritative earnings). Audit-only unless
   * setting `billingSourceOfTruth` = "partner". Run nightly in production; runnable on demand here.
   */
  @Post("reconcile")
  @RequirePermissions("commissions:approve")
  reconcile(@Body() body: { sinceISO?: string }) {
    return this.service.reconcileFromPartner({ sinceISO: body?.sinceISO });
  }
}

/** Admin dashboard KPIs (App-side money rollup). */
@Controller("admin/metrics")
export class AdminMetricsController {
  constructor(private readonly service: BillingService) {}

  @Get("overview")
  @RequirePermissions("billing:read")
  overview() {
    return this.service.adminOverview();
  }
}

/** Agency-scoped charges (only those attributed to the caller's agency, I-9). */
@Controller("agencies/me/charges")
export class AgencyChargesController {
  constructor(private readonly service: BillingService) {}

  @Get()
  list(
    @CurrentUser() user: AccessTokenPayload,
    @Query("take") take?: string,
    @Query("cursor") cursor?: string,
  ) {
    if (!user?.agencyId) throw new ForbiddenException("Agency context required");
    return this.service.listForAgency(user.agencyId, { take: take ? Number(take) : undefined, cursor });
  }
}
