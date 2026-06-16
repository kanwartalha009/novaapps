import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { IS_PUBLIC_KEY } from "./decorators";
import { ACCESS_COOKIE } from "./auth.types";

/** Global guard — every route requires a valid access JWT unless @Public() (I-10). */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest();
    const bearer = (req.headers.authorization ?? "").replace(/^Bearer\s+/i, "");
    const token: string | undefined = req.cookies?.[ACCESS_COOKIE] || bearer || undefined;
    if (!token) throw new UnauthorizedException("Missing access token");

    try {
      req.user = await this.jwt.verifyAsync(token);
      return true;
    } catch {
      throw new UnauthorizedException("Invalid or expired access token");
    }
  }
}
