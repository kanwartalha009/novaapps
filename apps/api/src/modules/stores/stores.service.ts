import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { ConnectStoreDto } from "@nova/shared";
import { prisma as prismaSingleton, type Store } from "@nova/database";
import { PRISMA } from "../../prisma/prisma.module";

/** Spec: docs/03-modules/stores.md — agency-connected Shopify stores (one agency per store). */
@Injectable()
export class StoresService {
  constructor(@Inject(PRISMA) private readonly prisma: typeof prismaSingleton) {}

  /** Never expose the access token. */
  private toView(store: Store) {
    const { accessTokenEnc, ...rest } = store;
    return rest;
  }

  async connect(agencyId: string, dto: ConnectStoreDto) {
    const existing = await this.prisma.store.findUnique({ where: { shopDomain: dto.shopDomain } });
    if (existing) {
      throw new ConflictException(
        existing.agencyId === agencyId
          ? "Store already connected to this agency"
          : "Store is connected to another agency",
      );
    }
    const store = await this.prisma.store.create({
      data: { agencyId, shopDomain: dto.shopDomain, name: dto.name },
    });
    return this.toView(store);
  }

  async listForAgency(agencyId: string) {
    const rows = await this.prisma.store.findMany({
      where: { agencyId },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((s) => this.toView(s));
  }

  async getForAgency(agencyId: string, id: string) {
    const store = await this.prisma.store.findFirst({ where: { id, agencyId } });
    if (!store) throw new NotFoundException(`Store not found: ${id}`);
    return this.toView(store);
  }

  /**
   * Disconnect (agency OWNER only). The spec gates on "no ACTIVE installations"; the FK from
   * Installation → Store means a hard delete also requires no historical installs, so we block on
   * ANY installation and tell the operator to uninstall first. (Future: soft-delete to allow
   * disconnect while preserving UNINSTALLED history — flagged in stores.md.)
   */
  async disconnect(agencyId: string, agencyRole: string | undefined, id: string) {
    if (agencyRole !== "OWNER") {
      throw new ForbiddenException("Only the agency OWNER can disconnect a store");
    }
    const store = await this.prisma.store.findFirst({ where: { id, agencyId } });
    if (!store) throw new NotFoundException(`Store not found: ${id}`);
    const installs = await this.prisma.installation.count({ where: { storeId: id } });
    if (installs > 0) {
      throw new ConflictException("Store has installation history; uninstall its apps before disconnecting");
    }
    await this.prisma.store.delete({ where: { id } });
    return { ok: true };
  }

  /** Admin: cursor-paginated list across all agencies (no tokens). */
  async adminList(opts: { take?: number; cursor?: string } = {}) {
    const take = Math.min(Math.max(opts.take ?? 25, 1), 100);
    const rows = await this.prisma.store.findMany({
      take: take + 1,
      ...(opts.cursor ? { skip: 1, cursor: { id: opts.cursor } } : {}),
      orderBy: { createdAt: "desc" },
      include: { agency: { select: { id: true, name: true, slug: true } } },
    });
    const hasMore = rows.length > take;
    const page = hasMore ? rows.slice(0, take) : rows;
    return {
      items: page.map((s) => {
        const { accessTokenEnc, ...rest } = s;
        return rest;
      }),
      nextCursor: hasMore ? page[page.length - 1]!.id : null,
    };
  }
}
