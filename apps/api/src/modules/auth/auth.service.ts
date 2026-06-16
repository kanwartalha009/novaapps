import {
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { createHash, randomBytes } from "crypto";
import * as argon2 from "argon2";
import { PERMISSIONS, type LoginDto, type AuthMeResponse } from "@nova/shared";
import { prisma as prismaSingleton } from "@nova/database";
import { PRISMA } from "../../prisma/prisma.module";
import { AccessTokenPayload, REFRESH_TTL_SEC } from "./auth.types";

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

/**
 * DEV BYPASS (no database required).
 * Active only when AUTH_DEV_BYPASS=true AND NODE_ENV !== 'production'.
 * Any email/password is accepted; sessions are stateless 12h JWTs.
 * Spec: docs/03-modules/auth.md → "Dev bypass". Never enable in production.
 */
export function isDevBypass(): boolean {
  return process.env.AUTH_DEV_BYPASS === "true" && process.env.NODE_ENV !== "production";
}

const DEV_BYPASS_TTL = "12h";

@Injectable()
export class AuthService {
  constructor(
    @Inject(PRISMA) private readonly prisma: typeof prismaSingleton,
    private readonly jwt: JwtService,
  ) {}

  /** Spec: docs/03-modules/auth.md — audience-aware login. */
  async login(
    dto: LoginDto,
  ): Promise<{ payload: AccessTokenPayload; access: string; refresh: string }> {
    if (isDevBypass()) return this.devLogin(dto);

    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      include: {
        roles: {
          include: {
            role: { include: { permissions: { include: { permission: true } } } },
          },
        },
        memberships: { include: { agency: true } },
      },
    });
    if (!user || !user.isActive) throw new UnauthorizedException("Invalid credentials");

    const ok = await argon2.verify(user.passwordHash, dto.password);
    if (!ok) throw new UnauthorizedException("Invalid credentials");

    const payload: AccessTokenPayload = {
      sub: user.id,
      aud: dto.audience,
      email: user.email,
      name: user.name,
    };

    if (dto.audience === "admin") {
      const permissions = this.collectPermissions(user);
      if (permissions.length === 0) throw new ForbiddenException("No admin access");
      payload.permissions = permissions;
    } else {
      if (!dto.agencySlug) throw new UnauthorizedException("agencySlug required");
      const membership = user.memberships.find(
        (m: { agency: { slug: string } }) => m.agency.slug === dto.agencySlug,
      );
      if (!membership) throw new ForbiddenException("Not a member of this agency");
      if (membership.agency.status === "SUSPENDED") {
        throw new ForbiddenException("Agency suspended");
      }
      payload.agencyId = membership.agencyId;
      payload.agencySlug = membership.agency.slug;
      payload.agencyRole = membership.role;
    }

    const access = await this.jwt.signAsync({ ...payload });
    const refresh = await this.issueRefreshToken(user.id, dto.audience);
    return { payload, access, refresh };
  }

  /** Rotating refresh (spec: auth.md). Old token revoked, new pair issued. */
  async refresh(token: string): Promise<{ access: string; refresh: string }> {
    if (isDevBypass()) {
      // Stateless: the refresh cookie is itself a JWT in bypass mode.
      try {
        const { exp, iat, ...payload } = await this.jwt.verifyAsync(token);
        const access = await this.jwt.signAsync(payload, { expiresIn: DEV_BYPASS_TTL });
        return { access, refresh: access };
      } catch {
        throw new UnauthorizedException("Invalid refresh token");
      }
    }

    const row = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: sha256(token) },
      include: { user: true },
    });
    if (!row || row.revokedAt || row.expiresAt < new Date() || !row.user.isActive) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    await this.prisma.refreshToken.update({
      where: { id: row.id },
      data: { revokedAt: new Date() },
    });

    const payload = await this.buildPayload(row.userId, row.audience as "admin" | "agency");
    const access = await this.jwt.signAsync({ ...payload });
    const refresh = await this.issueRefreshToken(row.userId, row.audience);
    return { access, refresh };
  }

  async logout(token: string | undefined): Promise<void> {
    if (!token || isDevBypass()) return; // bypass sessions are stateless; clearing cookies suffices
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: sha256(token), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  me(payload: AccessTokenPayload): AuthMeResponse {
    return {
      userId: payload.sub,
      email: payload.email,
      name: payload.name,
      audience: payload.aud,
      permissions: payload.permissions,
      agency:
        payload.agencyId && payload.agencySlug
          ? {
              id: payload.agencyId,
              slug: payload.agencySlug,
              name: payload.agencySlug,
              role: payload.agencyRole ?? "MEMBER",
            }
          : undefined,
    };
  }

  /** DEV BYPASS: fabricate a session without touching the database. */
  private async devLogin(
    dto: LoginDto,
  ): Promise<{ payload: AccessTokenPayload; access: string; refresh: string }> {
    // eslint-disable-next-line no-console
    console.warn(`[AUTH_DEV_BYPASS] Issuing fake ${dto.audience} session for ${dto.email} — dev only`);
    const payload: AccessTokenPayload = {
      sub: `dev-user-${dto.audience}`,
      aud: dto.audience,
      email: dto.email.toLowerCase(),
      name: "Dev User",
    };
    if (dto.audience === "admin") {
      payload.permissions = [...PERMISSIONS];
    } else {
      if (!dto.agencySlug) throw new UnauthorizedException("agencySlug required");
      payload.agencyId = "dev-agency";
      payload.agencySlug = dto.agencySlug;
      payload.agencyRole = "OWNER";
    }
    const access = await this.jwt.signAsync({ ...payload }, { expiresIn: DEV_BYPASS_TTL });
    return { payload, access, refresh: access };
  }

  private collectPermissions(user: {
    roles: { role: { permissions: { permission: { key: string } }[] } }[];
  }): string[] {
    return [
      ...new Set(
        user.roles.flatMap((ur) => ur.role.permissions.map((rp) => rp.permission.key)),
      ),
    ];
  }

  private async issueRefreshToken(userId: string, audience: string): Promise<string> {
    const token = randomBytes(48).toString("hex");
    await this.prisma.refreshToken.create({
      data: {
        userId,
        audience,
        tokenHash: sha256(token),
        expiresAt: new Date(Date.now() + REFRESH_TTL_SEC * 1000),
      },
    });
    return token;
  }

  private async buildPayload(
    userId: string,
    audience: "admin" | "agency",
  ): Promise<AccessTokenPayload> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: { include: { permissions: { include: { permission: true } } } },
          },
        },
        memberships: { include: { agency: true } },
      },
    });
    const payload: AccessTokenPayload = {
      sub: user.id,
      aud: audience,
      email: user.email,
      name: user.name,
    };
    if (audience === "admin") {
      payload.permissions = this.collectPermissions(user);
    } else {
      // Single-membership assumption on refresh; multi-agency users re-login.
      const m = user.memberships[0];
      if (m) {
        payload.agencyId = m.agencyId;
        payload.agencySlug = m.agency.slug;
        payload.agencyRole = m.role;
      }
    }
    return payload;
  }
}
