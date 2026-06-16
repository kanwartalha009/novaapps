import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Put,
} from "@nestjs/common";
import { setAvailabilitySchema, productTypeSchema } from "@nova/shared";
import { AvailabilityService } from "./availability.service";
import { RequirePermissions, CurrentUser } from "../auth/decorators";
import type { AccessTokenPayload } from "../auth/auth.types";
import { zodParse } from "../../common/zod";

/** Admin availability policy (ADR-011). PUT replaces the whole policy for a product. */
@Controller("admin/availability")
export class AvailabilityController {
  constructor(private readonly service: AvailabilityService) {}

  private parseType(raw: string): "APP" | "TOOL" {
    const r = productTypeSchema.safeParse(raw.toUpperCase());
    if (!r.success) throw new BadRequestException("productType must be APP or TOOL");
    return r.data;
  }

  @Get(":productType/:productId")
  @RequirePermissions("availability:write")
  get(@Param("productType") productType: string, @Param("productId") productId: string) {
    return this.service.get(this.parseType(productType), productId);
  }

  @Put(":productType/:productId")
  @RequirePermissions("availability:write")
  set(
    @Param("productType") productType: string,
    @Param("productId") productId: string,
    @Body() body: unknown,
    @CurrentUser() user: AccessTokenPayload,
  ) {
    return this.service.set(
      this.parseType(productType),
      productId,
      zodParse(setAvailabilitySchema, body),
      user?.sub,
    );
  }
}
