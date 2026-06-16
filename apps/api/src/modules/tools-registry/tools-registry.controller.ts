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
import { createToolSchema, updateToolSchema, upsertToolPlanSchema } from "@nova/shared";
import { ToolsRegistryService } from "./tools-registry.service";
import { RequirePermissions, CurrentUser } from "../auth/decorators";
import type { AccessTokenPayload } from "../auth/auth.types";
import { zodParse } from "../../common/zod";

/** Admin Tools registry (spec: docs/03-modules/tools-registry.md). Guarded by RBAC (I-10). */
@Controller("admin/tools")
export class ToolsRegistryController {
  constructor(private readonly service: ToolsRegistryService) {}

  @Get()
  @RequirePermissions("tools:read")
  list(@Query("take") take?: string, @Query("cursor") cursor?: string) {
    return this.service.list({ take: take ? Number(take) : undefined, cursor });
  }

  @Post()
  @RequirePermissions("tools:write")
  create(@Body() body: unknown) {
    return this.service.create(zodParse(createToolSchema, body));
  }

  @Get("by-slug/:slug")
  @RequirePermissions("tools:read")
  getBySlug(@Param("slug") slug: string) {
    return this.service.getBySlug(slug);
  }

  @Get(":id")
  @RequirePermissions("tools:read")
  get(@Param("id") id: string) {
    return this.service.getById(id);
  }

  @Patch(":id")
  @RequirePermissions("tools:write")
  update(@Param("id") id: string, @Body() body: unknown) {
    return this.service.update(id, zodParse(updateToolSchema, body));
  }

  @Post(":id/publish")
  @RequirePermissions("tools:publish")
  publish(@Param("id") id: string) {
    return this.service.publish(id);
  }

  @Get(":id/plans")
  @RequirePermissions("tools:read")
  listPlans(@Param("id") id: string) {
    return this.service.listPlans(id);
  }

  @Post(":id/plans")
  @RequirePermissions("tools:write")
  upsertPlan(@Param("id") id: string, @Body() body: unknown) {
    return this.service.upsertPlan(id, zodParse(upsertToolPlanSchema, body));
  }
}

/** Agency-audience tools catalog — published + availability-filtered. */
@Controller("catalog")
export class ToolCatalogController {
  constructor(private readonly service: ToolsRegistryService) {}

  @Get("tools")
  tools(@CurrentUser() user: AccessTokenPayload) {
    if (!user?.agencyId) throw new ForbiddenException("Agency context required");
    return this.service.catalogForAgency(user.agencyId);
  }
}
