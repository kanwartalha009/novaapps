import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { SetAvailabilityDto } from "@nova/shared";
import { prisma as prismaSingleton } from "@nova/database";
import { PRISMA } from "../../prisma/prisma.module";

type ProductType = "APP" | "TOOL";

/**
 * Unified availability authority for apps AND tools (ADR-011).
 * PRIVATE = allowlist (only ALLOW-listed agencies); PUBLIC = all except DENY-listed.
 * No policy row = not offered (default deny). Every change is audited (07-quality §D).
 */
@Injectable()
export class AvailabilityService {
  constructor(@Inject(PRISMA) private readonly prisma: typeof prismaSingleton) {}

  /** The resolver consumed by catalogs + (later) entitlements. */
  async isAvailable(productType: ProductType, productId: string, agencyId: string): Promise<boolean> {
    const avail = await this.prisma.availability.findUnique({
      where: { productType_productId: { productType, productId } },
      include: { entries: true },
    });
    if (!avail) return false;
    if (avail.mode === "PUBLIC") {
      return !avail.entries.some((e) => e.agencyId === agencyId && e.effect === "DENY");
    }
    return avail.entries.some((e) => e.agencyId === agencyId && e.effect === "ALLOW");
  }

  async get(productType: ProductType, productId: string) {
    return this.prisma.availability.findUnique({
      where: { productType_productId: { productType, productId } },
      include: { entries: true },
    });
  }

  /** Set mode + replace entries atomically; write an AuditLog row. */
  async set(productType: ProductType, productId: string, dto: SetAvailabilityDto, actorId?: string) {
    await this.assertProductExists(productType, productId);

    await this.prisma.$transaction(async (tx: any) => {
      const avail = await tx.availability.upsert({
        where: { productType_productId: { productType, productId } },
        update: { mode: dto.mode },
        create: { productType, productId, mode: dto.mode },
      });
      await tx.availabilityEntry.deleteMany({ where: { availabilityId: avail.id } });
      if (dto.entries.length > 0) {
        await tx.availabilityEntry.createMany({
          data: dto.entries.map((e) => ({
            availabilityId: avail.id,
            agencyId: e.agencyId,
            effect: e.effect,
          })),
        });
      }
      await tx.auditLog.create({
        data: {
          actorId: actorId ?? null,
          action: "availability.update",
          targetType: productType,
          targetId: productId,
          metadata: { mode: dto.mode, entries: dto.entries.length },
        },
      });
    });

    return this.get(productType, productId);
  }

  private async assertProductExists(productType: ProductType, productId: string) {
    const count =
      productType === "APP"
        ? await this.prisma.app.count({ where: { id: productId } })
        : await this.prisma.tool.count({ where: { id: productId } });
    if (count === 0) throw new NotFoundException(`${productType} not found: ${productId}`);
  }
}
