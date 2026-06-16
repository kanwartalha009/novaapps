import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import * as argon2 from "argon2";
import type { AgencySignupDto } from "@nova/shared";
import { prisma as prismaSingleton, type AgencyStatus } from "@nova/database";
import { PRISMA } from "../../prisma/prisma.module";
import { isDevBypass } from "../auth/auth.service";

@Injectable()
export class AgenciesService {
  constructor(@Inject(PRISMA) private readonly prisma: typeof prismaSingleton) {}

  /**
   * Spec: docs/03-modules/agencies.md — signup creates Agency(PENDING_APPROVAL)
   * + owner User + AgencyMember(OWNER) atomically.
   */
  async signup(dto: AgencySignupDto) {
    if (isDevBypass()) {
      // eslint-disable-next-line no-console
      console.warn(`[AUTH_DEV_BYPASS] Fake agency signup '${dto.slug}' — nothing persisted`);
      return { agencyId: "dev-agency", slug: dto.slug, status: "PENDING_APPROVAL" };
    }

    const email = dto.ownerEmail.toLowerCase();

    const [existingUser, existingAgency] = await Promise.all([
      this.prisma.user.findUnique({ where: { email } }),
      this.prisma.agency.findUnique({ where: { slug: dto.slug } }),
    ]);
    if (existingUser) throw new ConflictException("Email already registered");
    if (existingAgency) throw new ConflictException("Agency slug already taken");

    const passwordHash = await argon2.hash(dto.password);

    const agency = await this.prisma.$transaction(async (tx: any) => {
      const user = await tx.user.create({
        data: { email, name: dto.ownerName, passwordHash },
      });
      const agency = await tx.agency.create({
        data: { name: dto.agencyName, slug: dto.slug },
      });
      await tx.agencyMember.create({
        data: { agencyId: agency.id, userId: user.id, role: "OWNER" },
      });
      return agency;
    });

    return { agencyId: agency.id, slug: agency.slug, status: agency.status };
  }

  // ─── Admin (flag P1-3) ──────────────────────────────────────────
  /** Admin list (cursor-paginated; optional status filter). */
  async list(opts: { take?: number; cursor?: string; status?: string } = {}) {
    const take = Math.min(Math.max(opts.take ?? 50, 1), 200);
    const rows = await this.prisma.agency.findMany({
      take: take + 1,
      ...(opts.cursor ? { skip: 1, cursor: { id: opts.cursor } } : {}),
      where: opts.status ? { status: opts.status as AgencyStatus } : {},
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { stores: true, members: true, installations: true } } },
    });
    const hasMore = rows.length > take;
    const page = hasMore ? rows.slice(0, take) : rows;
    return { items: page, nextCursor: hasMore ? page[page.length - 1]!.id : null };
  }

  async getById(id: string) {
    const agency = await this.prisma.agency.findUnique({
      where: { id },
      include: {
        members: { include: { user: { select: { id: true, email: true, name: true } } } },
        _count: { select: { stores: true, installations: true } },
      },
    });
    if (!agency) throw new NotFoundException(`Agency not found: ${id}`);
    return agency;
  }

  /** PENDING_APPROVAL → ACTIVE (status transition). `slug` stays immutable after approval (ADR-005). */
  async approve(id: string) {
    await this.assertExists(id);
    return this.prisma.agency.update({ where: { id }, data: { status: "ACTIVE" } });
  }

  /** Suspend / reactivate. */
  async setStatus(id: string, status: "ACTIVE" | "SUSPENDED") {
    await this.assertExists(id);
    return this.prisma.agency.update({ where: { id }, data: { status } });
  }

  private async assertExists(id: string) {
    const count = await this.prisma.agency.count({ where: { id } });
    if (count === 0) throw new NotFoundException(`Agency not found: ${id}`);
  }
}
