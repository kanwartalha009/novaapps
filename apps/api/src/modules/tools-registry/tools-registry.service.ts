import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { CreateToolDto, UpdateToolDto, UpsertToolPlanDto } from "@nova/shared";
import { prisma as prismaSingleton, type Tool } from "@nova/database";
import { PRISMA } from "../../prisma/prisma.module";
import { AvailabilityService } from "../availability/availability.service";

/** Spec: docs/03-modules/tools-registry.md — Tool catalog + plans (Stripe wiring is P6). */
@Injectable()
export class ToolsRegistryService {
  constructor(
    @Inject(PRISMA) private readonly prisma: typeof prismaSingleton,
    private readonly availability: AvailabilityService,
  ) {}

  private toAdminView(tool: Tool & { plans?: unknown[] }) {
    return tool; // tools hold no encrypted secrets
  }

  private toPublicView(tool: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    iconUrl: string | null;
    toolType: string;
    usesStoreBridge: boolean;
    plans?: Array<{ id: string; name: string; model: string; baseAmount: number; currency: string; interval: string; trialDays: number; perStore: boolean; perStoreAmount: number | null }>;
  }) {
    return {
      id: tool.id,
      name: tool.name,
      slug: tool.slug,
      description: tool.description,
      iconUrl: tool.iconUrl,
      toolType: tool.toolType,
      usesStoreBridge: tool.usesStoreBridge,
      plans: (tool.plans ?? []).map((p) => ({
        id: p.id,
        name: p.name,
        model: p.model,
        baseAmount: p.baseAmount,
        currency: p.currency,
        interval: p.interval,
        trialDays: p.trialDays,
        perStore: p.perStore,
        perStoreAmount: p.perStoreAmount,
      })),
    };
  }

  async list(opts: { take?: number; cursor?: string } = {}) {
    const take = Math.min(Math.max(opts.take ?? 25, 1), 100);
    const rows = await this.prisma.tool.findMany({
      take: take + 1,
      ...(opts.cursor ? { skip: 1, cursor: { id: opts.cursor } } : {}),
      orderBy: { createdAt: "desc" },
      include: { plans: { orderBy: { baseAmount: "asc" } } },
    });
    const hasMore = rows.length > take;
    const page = hasMore ? rows.slice(0, take) : rows;
    return { items: page.map((t) => this.toAdminView(t)), nextCursor: hasMore ? page[page.length - 1]!.id : null };
  }

  async getById(id: string) {
    const tool = await this.prisma.tool.findUnique({ where: { id }, include: { plans: { orderBy: { baseAmount: "asc" } } } });
    if (!tool) throw new NotFoundException(`Tool not found: ${id}`);
    return this.toAdminView(tool);
  }

  async getBySlug(slug: string) {
    const tool = await this.prisma.tool.findUnique({ where: { slug }, include: { plans: { orderBy: { baseAmount: "asc" } } } });
    if (!tool) throw new NotFoundException(`Tool not found: ${slug}`);
    return this.toAdminView(tool);
  }

  async create(dto: CreateToolDto) {
    const existing = await this.prisma.tool.findUnique({ where: { slug: dto.slug } });
    if (existing) throw new ConflictException(`Tool slug already taken: ${dto.slug}`);
    const tool = await this.prisma.tool.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        iconUrl: dto.iconUrl,
        toolType: dto.toolType, // fixed at creation (I-11)
        usesStoreBridge: dto.usesStoreBridge ?? false,
        requiredScopes: dto.requiredScopes ?? [],
      },
      include: { plans: true },
    });
    return this.toAdminView(tool);
  }

  async update(id: string, dto: UpdateToolDto) {
    await this.assertExists(id);
    const tool = await this.prisma.tool.update({
      where: { id },
      data: { ...dto },
      include: { plans: { orderBy: { baseAmount: "asc" } } },
    });
    return this.toAdminView(tool);
  }

  /** Publish → PUBLISHED. Store Bridge scope approval is enforced in P5 for STORE/HYBRID tools. */
  async publish(id: string) {
    await this.assertExists(id);
    const tool = await this.prisma.tool.update({
      where: { id },
      data: { status: "PUBLISHED" },
      include: { plans: { orderBy: { baseAmount: "asc" } } },
    });
    return this.toAdminView(tool);
  }

  async listPlans(toolId: string) {
    await this.assertExists(toolId);
    return this.prisma.toolPlan.findMany({ where: { toolId }, orderBy: { baseAmount: "asc" } });
  }

  async upsertPlan(toolId: string, dto: UpsertToolPlanDto) {
    await this.assertExists(toolId);
    return this.prisma.toolPlan.upsert({
      where: { toolId_name: { toolId, name: dto.name } },
      update: {
        model: dto.model,
        baseAmount: dto.baseAmount,
        currency: dto.currency,
        interval: dto.interval,
        trialDays: dto.trialDays,
        perStore: dto.perStore,
        perStoreAmount: dto.perStoreAmount,
        isActive: dto.isActive,
      },
      create: { toolId, ...dto },
    });
  }

  /** Agency catalog: PUBLISHED tools the agency may see (unified Availability, ADR-011). */
  async catalogForAgency(agencyId: string) {
    const tools = await this.prisma.tool.findMany({
      where: { status: "PUBLISHED" },
      include: { plans: { where: { isActive: true }, orderBy: { baseAmount: "asc" } } },
      orderBy: { name: "asc" },
    });
    const out: ReturnType<ToolsRegistryService["toPublicView"]>[] = [];
    for (const tool of tools) {
      if (await this.availability.isAvailable("TOOL", tool.id, agencyId)) out.push(this.toPublicView(tool));
    }
    return out;
  }

  private async assertExists(id: string) {
    const count = await this.prisma.tool.count({ where: { id } });
    if (count === 0) throw new NotFoundException(`Tool not found: ${id}`);
  }
}
