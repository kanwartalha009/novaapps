import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Post,
  Query,
} from "@nestjs/common";
import { connectStoreSchema } from "@nova/shared";
import { StoresService } from "./stores.service";
import { RequirePermissions, CurrentUser } from "../auth/decorators";
import type { AccessTokenPayload } from "../auth/auth.types";
import { zodParse } from "../../common/zod";

/** Agency-audience store management (spec: docs/03-modules/stores.md). Tenant from JWT (I-9). */
@Controller("agencies/me/stores")
export class StoresController {
  constructor(private readonly service: StoresService) {}

  private agencyId(user: AccessTokenPayload): string {
    if (!user?.agencyId) throw new ForbiddenException("Agency context required");
    return user.agencyId;
  }

  @Get()
  list(@CurrentUser() user: AccessTokenPayload) {
    return this.service.listForAgency(this.agencyId(user));
  }

  @Post()
  connect(@CurrentUser() user: AccessTokenPayload, @Body() body: unknown) {
    return this.service.connect(this.agencyId(user), zodParse(connectStoreSchema, body));
  }

  @Get(":id")
  get(@CurrentUser() user: AccessTokenPayload, @Param("id") id: string) {
    return this.service.getForAgency(this.agencyId(user), id);
  }

  @Delete(":id")
  disconnect(@CurrentUser() user: AccessTokenPayload, @Param("id") id: string) {
    return this.service.disconnect(this.agencyId(user), user.agencyRole, id);
  }
}

/** Admin read across all agencies. */
@Controller("admin/stores")
export class AdminStoresController {
  constructor(private readonly service: StoresService) {}

  @Get()
  @RequirePermissions("stores:read")
  list(@Query("take") take?: string, @Query("cursor") cursor?: string) {
    return this.service.adminList({ take: take ? Number(take) : undefined, cursor });
  }
}
