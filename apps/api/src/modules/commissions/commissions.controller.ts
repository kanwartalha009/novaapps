import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Header,
  Param,
  Post,
  Query,
} from "@nestjs/common";
import { adjustCommissionSchema } from "@nova/shared";
import { CommissionsService } from "./commissions.service";
import { RequirePermissions, CurrentUser } from "../auth/decorators";
import type { AccessTokenPayload } from "../auth/auth.types";
import { zodParse } from "../../common/zod";

/** Admin commissions — read + approve + manual adjust (spec: docs/03-modules/commissions.md). */
@Controller("admin/commissions")
export class CommissionsController {
  constructor(private readonly service: CommissionsService) {}

  @Get()
  @RequirePermissions("commissions:read")
  list(
    @Query("take") take?: string,
    @Query("cursor") cursor?: string,
    @Query("agencyId") agencyId?: string,
    @Query("status") status?: string,
  ) {
    return this.service.list({ take: take ? Number(take) : undefined, cursor, agencyId, status });
  }

  @Post("adjust")
  @RequirePermissions("commissions:approve")
  adjust(@Body() body: unknown) {
    return this.service.adjust(zodParse(adjustCommissionSchema, body));
  }

  @Post(":id/approve")
  @RequirePermissions("commissions:approve")
  approve(@Param("id") id: string) {
    return this.service.approve(id);
  }
}

/** Agency-scoped earnings (I-9). */
@Controller("agencies/me/commissions")
export class AgencyCommissionsController {
  constructor(private readonly service: CommissionsService) {}

  @Get()
  list(
    @CurrentUser() user: AccessTokenPayload,
    @Query("take") take?: string,
    @Query("cursor") cursor?: string,
  ) {
    if (!user?.agencyId) throw new ForbiddenException("Agency context required");
    return this.service.list({ agencyId: user.agencyId, take: take ? Number(take) : undefined, cursor });
  }

  @Get("summary")
  summary(@CurrentUser() user: AccessTokenPayload) {
    if (!user?.agencyId) throw new ForbiddenException("Agency context required");
    return this.service.summaryForAgency(user.agencyId);
  }

  @Get("statement.csv")
  @Header("Content-Type", "text/csv")
  @Header("Content-Disposition", "attachment; filename=commissions.csv")
  statement(@CurrentUser() user: AccessTokenPayload) {
    if (!user?.agencyId) throw new ForbiddenException("Agency context required");
    return this.service.statementCsv(user.agencyId);
  }
}
