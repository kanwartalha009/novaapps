import { Global, Module } from "@nestjs/common";
import { prisma } from "@nova/database";

/** DI token for the @nova/database singleton (ADR-002: only the API touches it). */
export const PRISMA = "PRISMA";

@Global()
@Module({
  providers: [{ provide: PRISMA, useValue: prisma }],
  exports: [PRISMA],
})
export class PrismaModule {}
