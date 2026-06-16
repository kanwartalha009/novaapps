import { Body, Controller, Get, Post, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { loginSchema } from "@nova/shared";
import { AuthService } from "./auth.service";
import { Public, CurrentUser } from "./decorators";
import {
  ACCESS_COOKIE,
  ACCESS_TTL_SEC,
  AccessTokenPayload,
  REFRESH_COOKIE,
  REFRESH_TTL_SEC,
} from "./auth.types";
import { zodParse } from "../../common/zod";

const isProd = process.env.NODE_ENV === "production";

// Production: scope cookies to the shared root domain (e.g. ".nova.app") so they flow across the
// admin./agency./…/api. subdomains. Unset in local dev → host-only cookies on localhost.
const cookieBase = {
  httpOnly: true,
  secure: isProd,
  sameSite: "lax" as const,
  path: "/",
  ...(process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {}),
};

function setAuthCookies(res: Response, access: string, refresh: string) {
  res.cookie(ACCESS_COOKIE, access, { ...cookieBase, maxAge: ACCESS_TTL_SEC * 1000 });
  res.cookie(REFRESH_COOKIE, refresh, { ...cookieBase, maxAge: REFRESH_TTL_SEC * 1000 });
}

@Controller("auth")
export class AuthController {
  constructor(private readonly service: AuthService) {}

  @Public()
  @Post("login")
  async login(@Body() body: unknown, @Res({ passthrough: true }) res: Response) {
    const dto = zodParse(loginSchema, body);
    const { payload, access, refresh } = await this.service.login(dto);
    setAuthCookies(res, access, refresh);
    return this.service.me(payload);
  }

  @Public()
  @Post("refresh")
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token: string | undefined = req.cookies?.[REFRESH_COOKIE];
    const { access, refresh } = await this.service.refresh(token ?? "");
    setAuthCookies(res, access, refresh);
    return { ok: true };
  }

  @Public()
  @Post("logout")
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.service.logout(req.cookies?.[REFRESH_COOKIE]);
    res.clearCookie(ACCESS_COOKIE, cookieBase);
    res.clearCookie(REFRESH_COOKIE, cookieBase);
    return { ok: true };
  }

  @Get("me")
  me(@CurrentUser() user: AccessTokenPayload) {
    return this.service.me(user);
  }
}
