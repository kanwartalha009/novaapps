import { SetMetadata, createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { Permission } from "@nova/shared";
import type { AccessTokenPayload } from "./auth.types";

export const IS_PUBLIC_KEY = "isPublic";
/** Bypass the global JwtAuthGuard (spec: docs/03-modules/auth.md). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const PERMISSIONS_KEY = "requiredPermissions";
/** Require one or more RBAC permissions (enforced by PermissionsGuard, I-10). */
export const RequirePermissions = (...perms: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, perms);

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): AccessTokenPayload => {
    const req = ctx.switchToHttp().getRequest();
    return req.user as AccessTokenPayload;
  },
);
