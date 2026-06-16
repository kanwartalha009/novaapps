import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Req,
  UnauthorizedException,
  type RawBodyRequest,
} from "@nestjs/common";
import type { Request } from "express";
import { z } from "zod";
import { ToolEngineService } from "./tool-engine.service";
import { RequirePermissions, Public } from "../auth/decorators";
import { zodParse } from "../../common/zod";
import { verifyNovaSignature } from "../../common/nova-signature";

const bridgeSchema = z.object({
  usesStoreBridge: z.boolean().optional(),
  requiredScopes: z.array(z.string()).optional(),
});

/** Spec: docs/03-modules/tool-engine.md — blueprint + build-pack + release tracking. */
@Controller("admin/tool-engine/tools")
export class ToolEngineController {
  constructor(private readonly service: ToolEngineService) {}

  @Get(":id/spec")
  @RequirePermissions("tools:read")
  getSpec(@Param("id") id: string) {
    return this.service.getSpec(id);
  }

  @Patch(":id/spec")
  @RequirePermissions("tools:write")
  patchSpec(@Param("id") id: string, @Body() body: unknown) {
    return this.service.patchSpec(id, body);
  }

  @Get(":id/spec/export")
  @RequirePermissions("tools:read")
  @Header("Content-Type", "text/markdown")
  exportPack(@Param("id") id: string) {
    return this.service.exportBuildPack(id);
  }

  @Get(":id/bridge")
  @RequirePermissions("tools:read")
  getBridge(@Param("id") id: string) {
    return this.service.getBridge(id);
  }

  @Patch(":id/bridge")
  @RequirePermissions("tools:write")
  patchBridge(@Param("id") id: string, @Body() body: unknown) {
    return this.service.patchBridge(id, zodParse(bridgeSchema, body));
  }

  @Get(":id/checklist")
  @RequirePermissions("tools:read")
  getChecklist(@Param("id") id: string) {
    return this.service.getChecklist(id);
  }

  @Patch(":id/checklist")
  @RequirePermissions("tools:write")
  patchChecklist(@Param("id") id: string, @Body() body: unknown) {
    return this.service.patchChecklist(id, body);
  }
}

/** CI callback from a tool's standalone repo (HMAC). */
@Controller("internal/tool-engine")
export class ToolEngineInternalController {
  constructor(private readonly service: ToolEngineService) {}

  @Public()
  @Post("ci-callback")
  async ci(
    @Req() req: RawBodyRequest<Request>,
    @Body() body: { toolSlug?: string; latestVersion?: string; repoUrl?: string },
  ) {
    const ok = verifyNovaSignature(
      req.rawBody,
      req.headers["x-nova-signature"] as string | undefined,
      process.env.NOVA_TOOL_CI_SECRET ?? "",
    );
    if (!ok) throw new UnauthorizedException("Invalid X-Nova-Signature");
    if (!body?.toolSlug) throw new UnauthorizedException("toolSlug required");
    return this.service.ciCallback({ toolSlug: body.toolSlug, latestVersion: body.latestVersion, repoUrl: body.repoUrl });
  }
}
