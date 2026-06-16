import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { agencySignupSchema } from "@nova/shared";
import { AgenciesService } from "./agencies.service";
import { Public, CurrentUser, RequirePermissions } from "../auth/decorators";
import type { AccessTokenPayload } from "../auth/auth.types";
import { zodParse } from "../../common/zod";

@Controller("agencies")
export class AgenciesController {
  constructor(private readonly service: AgenciesService) {}

  /** Public signup → PENDING_APPROVAL (spec: docs/03-modules/agencies.md). */
  @Public()
  @Post("signup")
  signup(@Body() body: unknown) {
    return this.service.signup(zodParse(agencySignupSchema, body));
  }

  /** Current tenant snapshot from the JWT; full record arrives with Phase 1 completion. */
  @Get("me")
  me(@CurrentUser() user: AccessTokenPayload) {
    return {
      agencyId: user.agencyId ?? null,
      slug: user.agencySlug ?? null,
      role: user.agencyRole ?? null,
    };
  }
}

/** Admin agency management — list + approval flow (flag P1-3; spec: agencies.md + admin-shell.md). */
@Controller("admin/agencies")
export class AdminAgenciesController {
  constructor(private readonly service: AgenciesService) {}

  @Get()
  @RequirePermissions("agencies:read")
  list(@Query("take") take?: string, @Query("cursor") cursor?: string, @Query("status") status?: string) {
    return this.service.list({ take: take ? Number(take) : undefined, cursor, status });
  }

  @Get(":id")
  @RequirePermissions("agencies:read")
  get(@Param("id") id: string) {
    return this.service.getById(id);
  }

  @Post(":id/approve")
  @RequirePermissions("agencies:write")
  approve(@Param("id") id: string) {
    return this.service.approve(id);
  }

  @Post(":id/suspend")
  @RequirePermissions("agencies:write")
  suspend(@Param("id") id: string) {
    return this.service.setStatus(id, "SUSPENDED");
  }

  @Post(":id/reactivate")
  @RequirePermissions("agencies:write")
  reactivate(@Param("id") id: string) {
    return this.service.setStatus(id, "ACTIVE");
  }
}
