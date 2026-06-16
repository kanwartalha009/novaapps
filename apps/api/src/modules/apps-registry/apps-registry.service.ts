import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { CreateAppDto, UpdateAppDto, UpsertAppPlanDto } from "@nova/shared";
import { prisma as prismaSingleton, type App } from "@nova/database";
import { PRISMA } from "../../prisma/prisma.module";
import { encryptSecret } from "../../common/crypto";
import { AvailabilityService } from "../availability/availability.service";

type AppRow = App;

/** Spec: docs/03-modules/apps-registry.md — App catalog, plans, encrypted credentials. */
@Injectable()
export class AppsRegistryService {
  constructor(
    @Inject(PRISMA) private readonly prisma: typeof prismaSingleton,
    private readonly availability: AvailabilityService,
  ) {}

  /** Admin-safe view: never expose encrypted secrets (only whether they're set). */
  private toAdminView(app: AppRow & { plans?: unknown[] }) {
    const { shopifyApiSecretEnc, shopifyWebhookSecretEnc, ...rest } = app;
    return {
      ...rest,
      hasApiSecret: Boolean(shopifyApiSecretEnc),
      hasWebhookSecret: Boolean(shopifyWebhookSecretEnc),
    };
  }

  /** Public catalog view: no credentials at all. */
  private toPublicView(app: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    iconUrl: string | null;
    pricingModel: string;
    plans?: Array<{
      name: string;
      amount: number;
      annualAmount?: number | null;
      preorderLimit?: number | null;
      notifyLimit?: number | null;
      currency: string;
      interval: string;
      trialDays: number;
    }>;
  }) {
    return {
      id: app.id,
      name: app.name,
      slug: app.slug,
      description: app.description,
      iconUrl: app.iconUrl,
      pricingModel: app.pricingModel,
      plans: (app.plans ?? []).map((p) => ({
        name: p.name,
        amount: p.amount,
        annualAmount: p.annualAmount ?? null,
        preorderLimit: p.preorderLimit ?? null,
        notifyLimit: p.notifyLimit ?? null,
        currency: p.currency,
        interval: p.interval,
        trialDays: p.trialDays,
      })),
    };
  }

  /** Cursor-paginated list (scale posture: no unbounded queries). */
  async list(opts: { take?: number; cursor?: string } = {}) {
    const take = Math.min(Math.max(opts.take ?? 25, 1), 100);
    const rows = await this.prisma.app.findMany({
      take: take + 1,
      ...(opts.cursor ? { skip: 1, cursor: { id: opts.cursor } } : {}),
      orderBy: { createdAt: "desc" },
      include: { plans: { orderBy: { amount: "asc" } } },
    });
    const hasMore = rows.length > take;
    const page = hasMore ? rows.slice(0, take) : rows;
    return {
      items: page.map((a) => this.toAdminView(a)),
      nextCursor: hasMore ? page[page.length - 1]!.id : null,
    };
  }

  async getById(id: string) {
    const app = await this.prisma.app.findUnique({
      where: { id },
      include: { plans: { orderBy: { amount: "asc" } } },
    });
    if (!app) throw new NotFoundException(`App not found: ${id}`);
    return this.toAdminView(app);
  }

  /** By slug — for the admin app-detail page (route is slug-keyed). */
  async getBySlug(slug: string) {
    const app = await this.prisma.app.findUnique({
      where: { slug },
      include: { plans: { orderBy: { amount: "asc" } } },
    });
    if (!app) throw new NotFoundException(`App not found: ${slug}`);
    return this.toAdminView(app);
  }

  async create(dto: CreateAppDto) {
    const existing = await this.prisma.app.findUnique({ where: { slug: dto.slug } });
    if (existing) throw new ConflictException(`App slug already taken: ${dto.slug}`);
    const app = await this.prisma.app.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        iconUrl: dto.iconUrl,
        listingUrl: dto.listingUrl,
        pricingModel: dto.pricingModel ?? "FREE",
      },
      include: { plans: true },
    });
    return this.toAdminView(app);
  }

  async update(id: string, dto: UpdateAppDto) {
    await this.assertExists(id);
    const { shopifyApiSecret, shopifyWebhookSecret, ...rest } = dto;
    const app = await this.prisma.app.update({
      where: { id },
      data: {
        ...rest,
        // Secrets: encrypt at rest, write-only. Omitted → unchanged.
        ...(shopifyApiSecret ? { shopifyApiSecretEnc: encryptSecret(shopifyApiSecret) } : {}),
        ...(shopifyWebhookSecret ? { shopifyWebhookSecretEnc: encryptSecret(shopifyWebhookSecret) } : {}),
      },
      include: { plans: { orderBy: { amount: "asc" } } },
    });
    return this.toAdminView(app);
  }

  /** Publish → PUBLISHED (visible in catalog, subject to Availability). Checklist automation = P2/engine. */
  async publish(id: string) {
    const app = await this.prisma.app.findUnique({ where: { id }, include: { plans: true } });
    if (!app) throw new NotFoundException(`App not found: ${id}`);
    if (app.pricingModel !== "FREE" && app.plans.length === 0) {
      throw new ConflictException("A paid app needs at least one plan before publishing");
    }
    const updated = await this.prisma.app.update({
      where: { id },
      data: { status: "PUBLISHED" },
      include: { plans: { orderBy: { amount: "asc" } } },
    });
    return this.toAdminView(updated);
  }

  async listPlans(appId: string) {
    await this.assertExists(appId);
    return this.prisma.appPlan.findMany({ where: { appId }, orderBy: { amount: "asc" } });
  }

  /** Upsert a plan by (appId, name). */
  async upsertPlan(appId: string, dto: UpsertAppPlanDto) {
    await this.assertExists(appId);
    return this.prisma.appPlan.upsert({
      where: { appId_name: { appId, name: dto.name } },
      update: {
        amount: dto.amount,
        annualAmount: dto.annualAmount,
        preorderLimit: dto.preorderLimit,
        notifyLimit: dto.notifyLimit,
        currency: dto.currency,
        interval: dto.interval,
        trialDays: dto.trialDays,
        shopifyHandle: dto.shopifyHandle,
        isActive: dto.isActive,
      },
      create: { appId, ...dto },
    });
  }

  /**
   * App-facing plan catalog (no auth): the installed app (e.g. Encore) reads its
   * plans + limits from GET /v1/apps/:slug/plans. Maps AppPlan rows into the app's
   * billing shape (amount in minor units; limit null = unlimited).
   */
  async plansForApp(slug: string) {
    const app = await this.prisma.app.findUnique({
      where: { slug },
      include: { plans: { where: { isActive: true }, orderBy: { amount: "asc" } } },
    });
    if (!app) return { plans: [] };
    return {
      plans: app.plans.map((p) => ({
        code: p.name.toLowerCase(),
        name: p.name,
        amountMonthly: p.amount,
        amountAnnual: p.annualAmount ?? Math.round(p.amount * 12 * 0.8),
        currency: p.currency,
        trialDays: p.trialDays,
        preorderLimit: p.preorderLimit ?? null,
        notifyLimit: p.notifyLimit ?? null,
      })),
    };
  }

  /**
   * Agency catalog: PUBLISHED apps the agency may see (unified Availability, ADR-011).
   * The resolver lives here for P1; Commit 5 extracts it to an `availability` service.
   */
  async catalogForAgency(agencyId: string) {
    const apps = await this.prisma.app.findMany({
      where: { status: "PUBLISHED" },
      include: { plans: { where: { isActive: true }, orderBy: { amount: "asc" } } },
      orderBy: { name: "asc" },
    });
    const out: ReturnType<AppsRegistryService["toPublicView"]>[] = [];
    for (const app of apps) {
      if (await this.availability.isAvailable("APP", app.id, agencyId)) {
        out.push(this.toPublicView(app));
      }
    }
    return out;
  }

  private async assertExists(id: string) {
    const count = await this.prisma.app.count({ where: { id } });
    if (count === 0) throw new NotFoundException(`App not found: ${id}`);
  }
}
