import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { IS_PUBLIC_KEY, PERMISSIONS_KEY } from "./decorators";
import type { AccessTokenPayload } from "./auth.types";

/**
 * Global guard — enforces @RequirePermissions(...) against the JWT's permission snapshot.
 * Runs AFTER JwtAuthGuard (registration order in AuthModule), so req.user is populated.
 * Routes with no @RequirePermissions pass through; @Public() routes are skipped (I-10).
 * UI hiding is cosmetic — this is the real enforcement.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const req = context.switchToHttp().getRequest();
    const user = req.user as AccessTokenPayload | undefined;
    const held = new Set(user?.permissions ?? []);
    const missing = required.filter((p) => !held.has(p));
    if (missing.length > 0) {
      throw new ForbiddenException(`Missing permission(s): ${missing.join(", ")}`);
    }
    return true;
  }
}
