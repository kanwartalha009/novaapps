import { Inject, Injectable, NotFoundException, BadRequestException, Logger } from "@nestjs/common";
import { prisma as prismaSingleton } from "@nova/database";
import { PRISMA } from "../../prisma/prisma.module";
import { isDevBypass } from "../auth/auth.service";

export interface ConfirmInstallDto {
  shopDomain: string;
  appSlug: string;
  planName?: string;
  installedAt?: string;
  /**
   * Referral attribution (agency slug). PRIMARY, automatic path: the merchant installs via an
   * agency referral link (…/install?ref=<agencySlug>); the app carries it here. Used ONLY to
   * provision a brand-new Store under the referring agency. Attribution is IMMUTABLE (I-8) — if
   * the Store already exists, its owning agency is never reassigned regardless of ref.
   */
  ref?: string;
}

@Injectable()
export class InstallationsService {
  private readonly log = new Logger(InstallationsService.name);

  constructor(@Inject(PRISMA) private readonly prisma: typeof prismaSingleton) {}

  status() {
    return { module: "installations", implemented: true, spec: "docs/03-modules/installations.md" };
  }

  /**
   * Resolve the agency that should own a NEW store at install time.
   *   1. ref (agency slug) from the referral link — the automatic, primary path.
   *   2. NOVA_DEFAULT_AGENCY_SLUG — "house"/direct installs with no referral (configurable).
   * Returns null if neither resolves (caller decides whether to reject).
   */
  private async resolveAttributionAgency(ref?: string) {
    if (ref) {
      const byRef = await this.prisma.agency.findUnique({ where: { slug: ref } });
      if (byRef) return byRef;
      this.log.warn(`Install ref="${ref}" matched no agency — falling back to default`);
    }
    const fallback = process.env.NOVA_DEFAULT_AGENCY_SLUG;
    if (fallback) {
      const byDefault = await this.prisma.agency.findUnique({ where: { slug: fallback } });
      if (byDefault) return byDefault;
    }
    return null;
  }

  /**
   * Install-confirm callback from an app backend (HMAC-verified in the controller).
   * Flips the Installation for (app, store) to ACTIVE, records the plan, sets installedAt.
   *
   * Attribution (the core of commission tracking): when the Store does not yet exist in Nova we
   * AUTO-PROVISION it under the agency resolved from `ref` (or the default agency). agencyId is
   * IMMUTABLE (invariant I-8): set only on Store create and Installation create, never changed.
   * Idempotent.
   */
  async confirmInstall(dto: ConfirmInstallDto) {
    if (isDevBypass()) {
      return { installationId: "dev-install", status: "ACTIVE", appSlug: dto.appSlug };
    }

    const app = await this.prisma.app.findUnique({ where: { slug: dto.appSlug } });
    if (!app) throw new NotFoundException(`Unknown app slug: ${dto.appSlug}`);

    // Resolve (or auto-provision) the store — attribution happens here, exactly once.
    let store = await this.prisma.store.findUnique({ where: { shopDomain: dto.shopDomain } });
    if (!store) {
      const agency = await this.resolveAttributionAgency(dto.ref);
      if (!agency) {
        throw new BadRequestException(
          `Cannot attribute install of ${dto.shopDomain}: no valid ref and no NOVA_DEFAULT_AGENCY_SLUG`,
        );
      }
      store = await this.prisma.store.create({
        data: { shopDomain: dto.shopDomain, agencyId: agency.id },
      });
      this.log.log(`Provisioned store ${dto.shopDomain} → agency ${agency.slug} (ref=${dto.ref ?? "—"})`);
    }

    const appPlan = dto.planName
      ? await this.prisma.appPlan.findUnique({
          where: { appId_name: { appId: app.id, name: dto.planName } },
        })
      : null;

    const installedAt = dto.installedAt ? new Date(dto.installedAt) : new Date();
    const existing = await this.prisma.installation.findFirst({
      where: { appId: app.id, storeId: store.id },
    });

    if (existing) {
      const updated = await this.prisma.installation.update({
        where: { id: existing.id },
        // agencyId intentionally NOT updated — immutable referral attribution (I-8).
        data: {
          status: "ACTIVE",
          installedAt,
          uninstalledAt: null,
          appPlanId: appPlan?.id ?? existing.appPlanId,
        },
      });
      return { installationId: updated.id, status: updated.status, agencyId: updated.agencyId };
    }

    const created = await this.prisma.installation.create({
      data: {
        appId: app.id,
        storeId: store.id,
        agencyId: store.agencyId, // attribution from the store's owning agency (immutable)
        appPlanId: appPlan?.id ?? null,
        status: "ACTIVE",
        installedAt,
      },
    });
    return { installationId: created.id, status: created.status, agencyId: created.agencyId };
  }

  /**
   * Lifecycle: app/uninstalled webhook → mark the active install UNINSTALLED (history kept) and
   * freeze billing so NO further charges accrue. On uninstall Shopify auto-cancels the subscription
   * with no proration credit — the merchant keeps access for the paid period but the app earns
   * nothing more, so the platform must stop accruing immediately.
   */
  async markUninstalled(appSlug: string, shopDomain: string) {
    if (isDevBypass()) return { ok: true };
    const [app, store] = await Promise.all([
      this.prisma.app.findUnique({ where: { slug: appSlug } }),
      this.prisma.store.findUnique({ where: { shopDomain } }),
    ]);
    if (!app || !store) return { ok: false };
    await this.prisma.installation.updateMany({
      where: { appId: app.id, storeId: store.id, status: "ACTIVE" },
      data: { status: "UNINSTALLED", uninstalledAt: new Date(), subscriptionStatus: "CANCELLED" },
    });
    return { ok: true };
  }
}
