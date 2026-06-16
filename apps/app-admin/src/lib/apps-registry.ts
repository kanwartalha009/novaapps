import {
  FX_APPS, resolveFxApp, resolveFxEngineState, resolveFxAppDb,
  type FxApp, type FxAppDb, type FxEngineState,
} from "@nova/shared";

/**
 * Hosted-app resolver — one subdomain per app (engine amendment 2026-06-10-c):
 *   [app-slug].nova-platform.localhost:3003
 * Routes carry no /apps/ prefix; the subdomain selects the app.
 * Phase 2: resolves from the platform API registry instead of fixtures.
 */
export const APP_HOST = process.env.NEXT_PUBLIC_APP_HOST ?? "nova-platform.localhost:3003";
const PROTO = APP_HOST.includes("localhost") ? "http" : "https";

export interface HostedApp {
  app: FxApp;
  engine: FxEngineState;
  modules: string[];
  db: FxAppDb;
  origin: string; // https://[slug].host
  routes: { panel: string; embed: string; oauth: string; webhooks: string };
}

export function appOrigin(slug: string): string {
  return `${PROTO}://${slug}.${APP_HOST}`;
}

/**
 * Always resolves — freshly created slugs (engine create flow) synthesize a
 * just-scaffolded DRAFT app, so the panel is live the moment the app is created.
 * Phase 2: resolves from the platform API registry; unknown slugs then 404.
 */
export function getHostedApp(appSlug: string): HostedApp {
  const app = resolveFxApp(appSlug);
  const engine = resolveFxEngineState(appSlug);
  return {
    app,
    engine,
    modules: engine.modules,
    db: resolveFxAppDb(appSlug),
    origin: appOrigin(appSlug),
    routes: { panel: "/", embed: "/embed", oauth: "/api/auth", webhooks: "/api/webhooks" },
  };
}

export function listHostedApps(): HostedApp[] {
  return FX_APPS.map((a) => getHostedApp(a.slug)!).filter(Boolean);
}

/** Module key → app panel feature section (specific sections per app, tied to its manifest). */
export const MODULE_FEATURES: Record<string, { label: string; desc: string }> = {
  "storefront-widget": { label: "Widget", desc: "Theme app extension settings and placement" },
  "admin-ui": { label: "Admin UI", desc: "Resource page actions and blocks" },
  "function-discount": { label: "Discounts", desc: "Discount function rules" },
  "function-cart-transform": { label: "Bundles", desc: "Cart transform configuration" },
  "function-validation": { label: "Validation", desc: "Checkout validation rules" },
  "function-delivery": { label: "Delivery", desc: "Delivery customization" },
  "function-payment": { label: "Payments", desc: "Payment customization" },
  pixel: { label: "Analytics", desc: "Web pixel events" },
  "customer-account": { label: "Customer account", desc: "Account UI blocks" },
  flow: { label: "Flow", desc: "Automation triggers and actions" },
  pos: { label: "POS", desc: "Point of Sale tiles" },
  checkout: { label: "Checkout", desc: "Checkout UI blocks" },
};
