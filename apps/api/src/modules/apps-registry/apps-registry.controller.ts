import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { createAppSchema, updateAppSchema, upsertAppPlanSchema } from "@nova/shared";
import { AppsRegistryService } from "./apps-registry.service";
import { RequirePermissions, CurrentUser, Public } from "../auth/decorators";
import type { AccessTokenPayload } from "../auth/auth.types";
import { zodParse } from "../../common/zod";

/** Admin surface — spec: docs/03-modules/apps-registry.md. Guarded by RBAC (I-10). */
@Controller("admin/apps")
export class AppsRegistryController {
  constructor(private readonly service: AppsRegistryService) {}

  @Get()
  @RequirePermissions("apps:read")
  list(@Query("take") take?: string, @Query("cursor") cursor?: string) {
    return this.service.list({ take: take ? Number(take) : undefined, cursor });
  }

  @Post()
  @RequirePermissions("apps:write")
  create(@Body() body: unknown) {
    return this.service.create(zodParse(createAppSchema, body));
  }

  @Get("by-slug/:slug")
  @RequirePermissions("apps:read")
  getBySlug(@Param("slug") slug: string) {
    return this.service.getBySlug(slug);
  }

  @Get(":id")
  @RequirePermissions("apps:read")
  get(@Param("id") id: string) {
    return this.service.getById(id);
  }

  @Patch(":id")
  @RequirePermissions("apps:write")
  update(@Param("id") id: string, @Body() body: unknown) {
    return this.service.update(id, zodParse(updateAppSchema, body));
  }

  @Post(":id/publish")
  @RequirePermissions("apps:publish")
  publish(@Param("id") id: string) {
    return this.service.publish(id);
  }

  @Get(":id/plans")
  @RequirePermissions("apps:read")
  listPlans(@Param("id") id: string) {
    return this.service.listPlans(id);
  }

  @Post(":id/plans")
  @RequirePermissions("apps:write")
  upsertPlan(@Param("id") id: string, @Body() body: unknown) {
    return this.service.upsertPlan(id, zodParse(upsertAppPlanSchema, body));
  }
}

/** Agency-audience catalog — published + availability-filtered (no credentials). */
@Controller("catalog")
export class CatalogController {
  constructor(private readonly service: AppsRegistryService) {}

  @Get("apps")
  apps(@CurrentUser() user: AccessTokenPayload) {
    if (!user?.agencyId) throw new ForbiddenException("Agency context required");
    return this.service.catalogForAgency(user.agencyId);
  }
}

/** App-facing plan catalog (public read) — the installed app (e.g. Encore) reads
 *  its plans + limits from GET /v1/apps/:slug/plans. No credentials. */
@Controller("apps")
export class AppPublicController {
  constructor(private readonly service: AppsRegistryService) {}

  @Public()
  @Get(":slug/plans")
  plans(@Param("slug") slug: string) {
    return this.service.plansForApp(slug);
  }
}
