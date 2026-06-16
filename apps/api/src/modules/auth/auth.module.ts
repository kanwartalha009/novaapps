import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { JwtModule } from "@nestjs/jwt";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { PermissionsGuard } from "./permissions.guard";
import { ACCESS_TTL_SEC } from "./auth.types";

/** Spec: docs/03-modules/auth.md */
@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET ?? "dev-only-secret-change-me",
      signOptions: { expiresIn: ACCESS_TTL_SEC },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    // Order matters: JwtAuthGuard populates req.user, then PermissionsGuard reads it.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
  exports: [AuthService],
})
export class AuthModule {}
