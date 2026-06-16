/**
 * ─── DEV FIXTURES ──────────────────────────────────────────────
 * Dummy data for UI scaffolding ONLY. Shapes mirror the Prisma
 * domain model (docs/01-architecture/domain-model.md) plus real
 * Shopify concepts (verified against shopify.dev):
 *  - access scope handles (AccessScope API)
 *  - subscription statuses: pending|active|declined|expired|frozen|cancelled
 *  - mandatory compliance webhooks: customers/data_request, customers/redact, shop/redact
 * Replaced by API calls module-by-module in Phases 2–4.
 */

export type ShopifySubscriptionStatus =
  | "pending" | "active" | "declined" | "expired" | "frozen" | "cancelled";

export interface FxAgency {
  id: string; name: string; slug: string;
  status: "PENDING_APPROVAL" | "ACTIVE" | "SUSPENDED";
  commissionRateBps: number | null; // null = platform default
  members: { name: string; email: string; role: "OWNER" | "MEMBER" }[];
  createdAt: string;
}

export interface FxAppPlan {
  name: string; amount: number; currency: string;
  interval: "EVERY_30_DAYS" | "ANNUAL"; trialDays: number;
}

export interface FxApp {
  id: string; slug: string; name: string; tagline: string;
  /** App details (captured in the create wizard, editable on the settings page). */
  description?: string;
  iconUrl?: string | null;
  supportEmail?: string;
  status: "DRAFT" | "PUBLISHED" | "DELISTED";
  pricingModel: "FREE" | "FREEMIUM" | "PREMIUM";
  scopes: string[]; webhookTopics: string[];
  plans: FxAppPlan[]; listingUrl: string | null;
  apiKeyMasked: string; activeInstalls: number;
}

export interface FxStore {
  id: string; shopDomain: string; name: string; agencySlug: string;
  shopifyPlan: "Basic" | "Shopify" | "Advanced" | "Plus";
  connectedAt: string;
}

/**
 * Per-store plan override (comp/discount) — bills ONE store free or reduced even
 * when the app is on a paid plan, so an agency can help a client at a discount.
 * Honored by the app at subscription-creation time; does NOT change the immutable
 * referral agencyId. A FREE comp yields no charge (so no commission); a discount
 * yields a smaller charge that the ledger + commissions derive from.
 */
export interface FxPlanOverride {
  kind: "FREE" | "PERCENT" | "FIXED";
  /** PERCENT: basis points off (5000 = 50% off). FIXED: flat price in minor units. FREE: omitted. */
  value?: number;
  reason?: string;
  setBy?: string; // agency slug or "admin"
}

export interface FxInstallation {
  id: string; appSlug: string; shopDomain: string; agencySlug: string;
  planName: string | null;
  status: "PENDING" | "ACTIVE" | "UNINSTALLED";
  subscriptionStatus: ShopifySubscriptionStatus | null;
  installedAt: string | null;
  /** Optional per-store comp/discount (see FxPlanOverride). */
  planOverride?: FxPlanOverride | null;
}

export interface FxCharge {
  id: string; externalId: string; appSlug: string; shopDomain: string;
  agencySlug: string; type: "SUBSCRIPTION" | "USAGE" | "ONE_TIME" | "REFUND";
  amount: number; currency: string; occurredAt: string;
}

export interface FxCommission {
  id: string; chargeId: string | null; agencySlug: string;
  basisAmount: number; rateBps: number; amount: number; currency: string;
  status: "PENDING" | "APPROVED" | "PAID" | "REVERSED";
  type: "EARNED" | "REVERSAL" | "ADJUSTMENT";
  appSlug: string; shopDomain: string; createdAt: string;
}

export interface FxPayout {
  id: string; agencySlug: string;
  provider: "MANUAL" | "STRIPE_CONNECT" | "PAYPAL";
  providerRef: string | null;
  status: "DRAFT" | "PROCESSING" | "PAID" | "FAILED";
  totalAmount: number; currency: string; commissionCount: number;
  createdAt: string; releasedAt: string | null;
}

export interface FxPayoutMethod {
  provider: "MANUAL" | "STRIPE_CONNECT" | "PAYPAL";
  label: string; isDefault: boolean; detailsMasked: string;
}

export interface FxWebhookEvent {
  id: string; externalId: string; appSlug: string; topic: string;
  shopDomain: string; status: "RECEIVED" | "PROCESSED" | "FAILED";
  error: string | null; createdAt: string;
}

export interface FxAdminUser {
  id: string; name: string; email: string; roles: string[];
  isActive: boolean; lastActiveAt: string;
}

export interface FxRole {
  name: string; description: string; permissions: string[]; isSystem: boolean;
}

// ─── Data ───────────────────────────────────────────────────────

export const FX_AGENCIES: FxAgency[] = [
  {
    id: "ag_1", name: "Acme Digital", slug: "acme", status: "ACTIVE",
    commissionRateBps: 2500,
    members: [
      { name: "Kanwar Talha", email: "kanwar@acme.agency", role: "OWNER" },
      { name: "Sara Malik", email: "sara@acme.agency", role: "MEMBER" },
    ],
    createdAt: "2026-03-02",
  },
  {
    id: "ag_2", name: "Pixelworks Studio", slug: "pixelworks", status: "ACTIVE",
    commissionRateBps: null,
    members: [{ name: "Dana Reyes", email: "dana@pixelworks.co", role: "OWNER" }],
    createdAt: "2026-04-11",
  },
  {
    id: "ag_3", name: "Northbeam Commerce", slug: "northbeam", status: "PENDING_APPROVAL",
    commissionRateBps: null,
    members: [{ name: "Omar Siddiqui", email: "omar@northbeam.io", role: "OWNER" }],
    createdAt: "2026-06-07",
  },
];

export const FX_APPS: FxApp[] = [
  {
    id: "app_4", slug: "encore", name: "Encore",
    tagline: "Preorder & back-in-stock for EU fashion — per-market, never oversells",
    description:
      "Turn out-of-stock and not-yet-released products into captured demand. Merchants enable preorder or a back-in-stock waitlist on any product in under two minutes — works inside the store's existing Shopify discounts, never oversells, flat transparent pricing, and preorder by market (in-stock here, preorder there). Shoppers reserve with pay-now, a deposit, or charge-later (incl. EU BNPL) via Shopify's Selling Plan API. The demand-capture front-end of the ARRS recovery engine: waitlist captures run through behavioural recovery, not a generic email blast.",
    iconUrl: null,
    supportEmail: "support+encore@nova-apps.dev",
    status: "DRAFT", pricingModel: "FREEMIUM",
    // Selling plans (write_products), inventory+location reconciliation for per-market,
    // order tagging + ship-date metafields (write_orders), Markets context, theme embed.
    scopes: ["read_products", "write_products", "read_inventory", "read_locations", "read_orders", "write_orders", "read_markets", "read_customers", "read_themes"],
    webhookTopics: ["app/uninstalled", "app_subscriptions/update", "orders/create", "orders/paid", "inventory_levels/update", "products/update", "customers/data_request", "customers/redact", "shop/redact"],
    // Flat FREEMIUM tiers — exact numbers TBD after pilot (spec §14/§17). Free tier removes the cold-start barrier.
    plans: [
      { name: "Free", amount: 0, currency: "USD", interval: "EVERY_30_DAYS", trialDays: 0 },
      { name: "Growth", amount: 1900, currency: "USD", interval: "EVERY_30_DAYS", trialDays: 14 },
      { name: "Scale", amount: 4900, currency: "USD", interval: "EVERY_30_DAYS", trialDays: 14 },
    ],
    listingUrl: null,
    apiKeyMasked: "9889•••••••••••••b554e1", activeInstalls: 3,
  },
];

export const FX_STORES: FxStore[] = [
  { id: "st_1", shopDomain: "velvet-thread.myshopify.com", name: "Velvet Thread", agencySlug: "acme", shopifyPlan: "Shopify", connectedAt: "2026-03-15" },
  { id: "st_2", shopDomain: "peak-supply-co.myshopify.com", name: "Peak Supply Co", agencySlug: "acme", shopifyPlan: "Advanced", connectedAt: "2026-03-22" },
  { id: "st_3", shopDomain: "luma-skincare.myshopify.com", name: "Luma Skincare", agencySlug: "acme", shopifyPlan: "Plus", connectedAt: "2026-04-30" },
  { id: "st_4", shopDomain: "happy-paws-pets.myshopify.com", name: "Happy Paws", agencySlug: "pixelworks", shopifyPlan: "Basic", connectedAt: "2026-05-02" },
  { id: "st_5", shopDomain: "atlas-outdoors.myshopify.com", name: "Atlas Outdoors", agencySlug: "pixelworks", shopifyPlan: "Shopify", connectedAt: "2026-05-19" },
];

export const FX_INSTALLATIONS: FxInstallation[] = [
  // Encore pilot — Nova portfolio stores running incumbents (spec §15/§16 Phase 5 validation gate).
  { id: "in_encore_1", appSlug: "encore", shopDomain: "velvet-thread.myshopify.com", agencySlug: "acme", planName: "Growth", status: "ACTIVE", subscriptionStatus: "active", installedAt: "2026-06-02" },
  { id: "in_encore_2", appSlug: "encore", shopDomain: "luma-skincare.myshopify.com", agencySlug: "acme", planName: "Scale", status: "ACTIVE", subscriptionStatus: "active", installedAt: "2026-06-03", planOverride: { kind: "PERCENT", value: 5000, reason: "Launch-partner discount", setBy: "acme" } },
  { id: "in_encore_3", appSlug: "encore", shopDomain: "peak-supply-co.myshopify.com", agencySlug: "acme", planName: "Growth", status: "ACTIVE", subscriptionStatus: null, installedAt: "2026-06-05", planOverride: { kind: "FREE", reason: "Nova retainer client — comped", setBy: "acme" } },
];

export const FX_CHARGES: FxCharge[] = [
  // Encore pilot subscription cycles (peak-supply-co is on Free → no charge).
  { id: "ch_encore_1", externalId: "gid://shopify/AppSubscription/41007", appSlug: "encore", shopDomain: "velvet-thread.myshopify.com", agencySlug: "acme", type: "SUBSCRIPTION", amount: 1900, currency: "USD", occurredAt: "2026-06-02" },
  { id: "ch_encore_2", externalId: "gid://shopify/AppSubscription/41008", appSlug: "encore", shopDomain: "luma-skincare.myshopify.com", agencySlug: "acme", type: "SUBSCRIPTION", amount: 2450, currency: "USD", occurredAt: "2026-06-03" }, // Scale $49 billed at 50% launch-partner comp
];

export const FX_COMMISSIONS: FxCommission[] = [
  // Encore pilot commissions — acme rate (2500 bps), inherited via the encore assignment.
  { id: "cm_encore_1", chargeId: "ch_encore_1", agencySlug: "acme", basisAmount: 1900, rateBps: 2500, amount: 475, currency: "USD", status: "PENDING", type: "EARNED", appSlug: "encore", shopDomain: "velvet-thread.myshopify.com", createdAt: "2026-06-02" },
  { id: "cm_encore_2", chargeId: "ch_encore_2", agencySlug: "acme", basisAmount: 2450, rateBps: 2500, amount: 613, currency: "USD", status: "PENDING", type: "EARNED", appSlug: "encore", shopDomain: "luma-skincare.myshopify.com", createdAt: "2026-06-03" }, // commission on the discounted charge
];

// No payouts yet — Encore's pilot commissions are still PENDING (not matured/approved).
export const FX_PAYOUTS: FxPayout[] = [];

export const FX_PAYOUT_METHODS: FxPayoutMethod[] = [
  { provider: "MANUAL", label: "Bank transfer (Wise)", isDefault: true, detailsMasked: "PK•••••••••4471 — Meezan Bank" },
  { provider: "PAYPAL", label: "PayPal", isDefault: false, detailsMasked: "k•••••@acme.agency" },
];

export const FX_WEBHOOK_EVENTS: FxWebhookEvent[] = [
  // Encore pilot ingress — preorder tagging, restock recovery, deposit capture. Zero failures (reliability-first, spec §13).
  { id: "wh_encore_1", externalId: "a1c7e904-5521", appSlug: "encore", topic: "orders/create", shopDomain: "velvet-thread.myshopify.com", status: "PROCESSED", error: null, createdAt: "2026-06-08 10:22" },
  { id: "wh_encore_2", externalId: "b2d8fa15-7733", appSlug: "encore", topic: "inventory_levels/update", shopDomain: "luma-skincare.myshopify.com", status: "PROCESSED", error: null, createdAt: "2026-06-09 14:05" },
  { id: "wh_encore_3", externalId: "c3e90b26-8844", appSlug: "encore", topic: "orders/paid", shopDomain: "luma-skincare.myshopify.com", status: "PROCESSED", error: null, createdAt: "2026-06-08 16:40" },
  { id: "wh_encore_4", externalId: "d4f01c37-9955", appSlug: "encore", topic: "app_subscriptions/update", shopDomain: "velvet-thread.myshopify.com", status: "PROCESSED", error: null, createdAt: "2026-06-02 09:00" },
  { id: "wh_encore_5", externalId: "e5012d48-0a66", appSlug: "encore", topic: "products/update", shopDomain: "velvet-thread.myshopify.com", status: "RECEIVED", error: null, createdAt: "2026-06-10 08:15" },
];

export const FX_ADMIN_USERS: FxAdminUser[] = [
  { id: "u_1", name: "Platform Admin", email: "admin@nova-apps.dev", roles: ["SUPER_ADMIN"], isActive: true, lastActiveAt: "2026-06-10" },
  { id: "u_2", name: "Fatima Khan", email: "fatima@nova-apps.dev", roles: ["FINANCE"], isActive: true, lastActiveAt: "2026-06-09" },
  { id: "u_3", name: "Bilal Ahmed", email: "bilal@nova-apps.dev", roles: ["SUPPORT"], isActive: true, lastActiveAt: "2026-06-08" },
  { id: "u_4", name: "Maya Chen", email: "maya@nova-apps.dev", roles: ["FINANCE", "SUPPORT"], isActive: false, lastActiveAt: "2026-04-20" },
];

export const FX_ROLES: FxRole[] = [
  { name: "SUPER_ADMIN", description: "Full access to everything", permissions: ["*"], isSystem: true },
  { name: "FINANCE", description: "Money: charges, commissions, payouts", permissions: ["billing:read", "commissions:read", "commissions:approve", "payouts:read", "payouts:create", "payouts:release"], isSystem: false },
  { name: "SUPPORT", description: "Support queues + read-only operations", permissions: ["apps:read", "agencies:read", "stores:read", "billing:read", "support:read", "support:write"], isSystem: false },
];

export const FX_SETTINGS = {
  defaultCommissionRateBps: 2000,
  commissionBasis: "net" as "net" | "gross",
  commissionMaturityDays: 30,
  minPayoutAmount: 5000,
  /** ADR-006: pluggable bot backend — switchable without deploy, per-app override on App. */
  supportBotProvider: "RULES" as "RULES" | "LLM",
};

/** Agency↔App assignment (C2 2026-06-10). rateBps null = inherit agency/platform rate. */
export interface FxAgencyApp {
  agencySlug: string;
  appSlug: string;
  rateBps: number | null;
  assignedAt: string;
}

export const FX_AGENCY_APPS: FxAgencyApp[] = [
  { agencySlug: "acme", appSlug: "encore", rateBps: null, assignedAt: "2026-05-28" }, // Nova portfolio pilot — inherits acme rate
];

/** Effective rate for an agency+app: assignment override → agency rate → platform default. */
export function resolveRateBps(agencySlug: string, appSlug: string): number {
  const assignment = FX_AGENCY_APPS.find((x) => x.agencySlug === agencySlug && x.appSlug === appSlug);
  if (assignment?.rateBps != null) return assignment.rateBps;
  const agency = FX_AGENCIES.find((a) => a.slug === agencySlug);
  return agency?.commissionRateBps ?? FX_SETTINGS.defaultCommissionRateBps;
}

/** ACTIVE installs of an app, optionally scoped to one agency — drives the redaction gate. */
export function activeInstallCount(appSlug: string, agencySlug?: string): number {
  return FX_INSTALLATIONS.filter(
    (i) => i.appSlug === appSlug && i.status === "ACTIVE" && (agencySlug ? i.agencySlug === agencySlug : true),
  ).length;
}

/**
 * Redaction gate (invariant): an app's availability may be revoked from an agency
 * only while that agency has NO active installations of it — existing merchants are
 * never cut off. Revoking from ALL agencies requires zero active installs anywhere.
 */
export function canRevokeAgencyApp(appSlug: string, agencySlug: string): boolean {
  return activeInstallCount(appSlug, agencySlug) === 0;
}
export function canRevokeAllAgencyApps(appSlug: string): boolean {
  return activeInstallCount(appSlug) === 0;
}

// ─── Engine fixtures (spec: docs/03-modules/engine.md) ──────────

export interface FxEngineModule {
  key: string;
  label: string;
  desc: string;
  surface: "Admin" | "Online store" | "Checkout" | "Functions" | "Customer accounts" | "POS" | "Flow" | "Analytics";
  defaultScopes: string[];
  plusOnly?: boolean;
  maxPerApp?: number;
  reviewRequired?: boolean;
  locked?: boolean; // always included
}

export const FX_ENGINE_MODULES: FxEngineModule[] = [
  { key: "backend", label: "Backend (App Home)", desc: "Embedded Remix app in Shopify admin — OAuth, Billing API plans, GDPR webhooks, and Nova charge forwarding pre-wired.", surface: "Admin", defaultScopes: [], locked: true },
  { key: "admin-ui", label: "Admin UI extensions", desc: "Actions, blocks, and links on admin resource pages (orders, products, customers).", surface: "Admin", defaultScopes: [] },
  { key: "storefront-widget", label: "Storefront widget", desc: "Theme app extension — app blocks (placeable in sections) and app embeds. The only App-Store-legal theme integration.", surface: "Online store", defaultScopes: ["read_themes"] },
  { key: "checkout", label: "Checkout UI", desc: "Blocks at checkout targets + thank-you/order-status pages.", surface: "Checkout", defaultScopes: [], plusOnly: true },
  { key: "function-discount", label: "Function: Discount", desc: "Custom discount types (product/order/shipping) running inside Shopify.", surface: "Functions", defaultScopes: ["write_discounts", "read_discounts"] },
  { key: "function-cart-transform", label: "Function: Cart transform", desc: "Bundles — merge/expand cart lines, override price/title/image.", surface: "Functions", defaultScopes: ["write_cart_transforms"], maxPerApp: 1 },
  { key: "function-validation", label: "Function: Validation", desc: "Block checkout on custom cart rules.", surface: "Functions", defaultScopes: ["write_validations"] },
  { key: "function-delivery", label: "Function: Delivery", desc: "Hide/rename/reorder shipping options.", surface: "Functions", defaultScopes: ["write_delivery_customizations"] },
  { key: "function-payment", label: "Function: Payment", desc: "Hide/rename/reorder payment methods.", surface: "Functions", defaultScopes: ["write_payment_customizations"] },
  { key: "pixel", label: "Web pixel", desc: "Sandboxed analytics pixel subscribing to customer events.", surface: "Analytics", defaultScopes: ["write_pixels", "read_customer_events"] },
  { key: "customer-account", label: "Customer account UI", desc: "Blocks on order index, order status, and profile pages.", surface: "Customer accounts", defaultScopes: [] },
  { key: "flow", label: "Flow actions & triggers", desc: "Make the app a node in merchants' Shopify Flow automations.", surface: "Flow", defaultScopes: [] },
  { key: "pos", label: "POS UI", desc: "Smart grid tiles, cart, and post-purchase screens in Shopify POS.", surface: "POS", defaultScopes: [] },
];

export const FX_SCOPE_GROUPS: { group: string; scopes: string[] }[] = [
  { group: "Products", scopes: ["read_products", "write_products", "read_inventory", "write_inventory"] },
  { group: "Orders", scopes: ["read_orders", "write_orders", "read_fulfillments", "write_fulfillments"] },
  { group: "Customers", scopes: ["read_customers", "write_customers"] },
  { group: "Pricing", scopes: ["read_discounts", "write_discounts", "read_price_rules", "write_price_rules"] },
  { group: "Online store", scopes: ["read_themes", "write_themes", "read_content", "write_content"] },
  { group: "Analytics", scopes: ["read_analytics", "read_marketing_events", "write_marketing_events"] },
];

export const FX_PUBLISH_CHECKLIST: { key: string; label: string; manual: string; automated?: boolean }[] = [
  // Automated since amendment 2026-06-11-d: the engine runs `shopify app init
  // --name <app> --organization-id $SHOPIFY_ORG_ID` non-interactively, then
  // `shopify app deploy` pushes shopify.app.toml; client_id is captured back.
  { key: "partner_app", label: "App created in Shopify org", manual: "Engine: shopify app init → client_id captured into registry", automated: true },
  { key: "distribution", label: "Distribution selected (IRREVERSIBLE)", manual: "Public or Custom — cannot be changed later" },
  { key: "billing_tested", label: "Billing plans tested on dev store", manual: "Test charges via app dev" },
  { key: "gdpr_verified", label: "GDPR webhooks verified", manual: "customers/data_request, customers/redact, shop/redact" },
  { key: "listing", label: "App Store listing drafted", manual: "Listing form + screenshots" },
  { key: "review", label: "Submitted for review", manual: "Draft → Submitted → Reviewed → Published" },
];

export interface FxEngineState {
  repoUrl: string;
  clientIdMasked: string | null;
  /** App ID inside the Shopify org (Dev Dashboard). Engine-created (amendment 2026-06-11-d). */
  shopifyAppId: string | null;
  latestVersion: string | null;
  modules: string[];
  checklist: Record<string, boolean>;
}

/** Shopify org all platform apps live under (one org — decision 2026-06-10). */
export const FX_SHOPIFY_ORG = { name: "Nova Apps", id: "4218705" };

export const FX_ENGINE_STATE: Record<string, FxEngineState> = {
  "encore": {
    repoUrl: "github.com/kanwartalha009/encore",
    clientIdMasked: "a9f2•••4e7b",
    shopifyAppId: "88241007",
    latestVersion: "v6 (2026-06-09)",
    modules: ["backend", "storefront-widget", "flow", "customer-account"],
    // Pilot stage: created, deployed, billing + GDPR verified, distribution chosen (public).
    // Listing + review still pending — DRAFT until the validation gate (spec §15) is cleared.
    checklist: { partner_app: true, distribution: true, billing_tested: true, gdpr_verified: true, listing: false, review: false },
  },
};

// ─── Support fixtures (spec: docs/03-modules/support.md) ────────

export interface FxTicket {
  id: string;
  appSlug: string; // app-scoped — primary sort key
  shopDomain: string;
  agencySlug: string | null;
  subject: string;
  status: "OPEN" | "WAITING_ON_MERCHANT" | "RESOLVED";
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  assignee: string | null;
  botHandled: boolean;
  createdAt: string;
  lastActivityAt: string;
}

export interface FxTicketMessage {
  ticketId: string;
  author: "MERCHANT" | "BOT" | "SUPPORT" | "AGENCY";
  body: string;
  at: string;
}

export const FX_TICKETS: FxTicket[] = [
  { id: "tk_encore_1", appSlug: "encore", shopDomain: "velvet-thread.myshopify.com", agencySlug: "acme", subject: "Preorder badge not showing for the FR market", status: "OPEN", priority: "NORMAL", assignee: null, botHandled: false, createdAt: "2026-06-10 08:05", lastActivityAt: "2026-06-10 08:20" },
  { id: "tk_encore_2", appSlug: "encore", shopDomain: "luma-skincare.myshopify.com", agencySlug: "acme", subject: "Does the deposit show the right VAT at checkout?", status: "RESOLVED", priority: "LOW", assignee: null, botHandled: true, createdAt: "2026-06-07 12:10", lastActivityAt: "2026-06-07 12:11" },
];

export const FX_TICKET_MESSAGES: FxTicketMessage[] = [
  { ticketId: "tk_encore_1", author: "MERCHANT", body: "We enabled preorder on the new boots, but French shoppers still see 'Sold out' instead of the preorder badge. The Spanish storefront looks fine.", at: "2026-06-10 08:05" },
  { ticketId: "tk_encore_1", author: "BOT", body: "I can see Encore v6 with per-market rules enabled on this product. This looks market-specific rather than a configuration error — escalating to support with your market rules and the FR location inventory snapshot attached.", at: "2026-06-10 08:20" },
  { ticketId: "tk_encore_2", author: "MERCHANT", body: "Does the 20% deposit show the correct VAT at checkout for EU orders?", at: "2026-06-07 12:10" },
  { ticketId: "tk_encore_2", author: "BOT", body: "Yes — deposits run through Shopify's Selling Plan API, so VAT is calculated by Shopify on the deposit and again on the balance, per your store's tax settings. The preorder confirmation shows the ship date and the remaining balance. Anything else?", at: "2026-06-07 12:11" },
];

/** Weekly platform revenue series for dashboard charts (12 weeks, demo). */
export const FX_REVENUE_SERIES: { week: string; revenue: number; installs: number }[] = [
  { week: "Mar 23", revenue: 4200, installs: 1 },
  { week: "Mar 30", revenue: 5100, installs: 1 },
  { week: "Apr 6", revenue: 6800, installs: 2 },
  { week: "Apr 13", revenue: 6300, installs: 2 },
  { week: "Apr 20", revenue: 8900, installs: 3 },
  { week: "Apr 27", revenue: 9400, installs: 3 },
  { week: "May 4", revenue: 11600, installs: 4 },
  { week: "May 11", revenue: 13800, installs: 4 },
  { week: "May 18", revenue: 12900, installs: 5 },
  { week: "May 25", revenue: 15200, installs: 5 },
  { week: "Jun 1", revenue: 17400, installs: 5 },
  { week: "Jun 8", revenue: 19100, installs: 6 },
];

/** Per-app database config (engine amendment 2026-06-10-c: one DB per app, own migrations). */
export interface FxAppDb {
  envVar: string; // APP_DB_URL__<SLUG>
  urlMasked: string | null;
  status: "CONNECTED" | "NOT_CONFIGURED" | "MIGRATIONS_PENDING";
  migrations: number;
  lastMigratedAt: string | null;
  schemaPath: string; // shopify/<slug>/prisma/schema.prisma
}

export const FX_APP_DB: Record<string, FxAppDb> = {
  "encore": {
    envVar: "APP_DB_URL__ENCORE",
    urlMasked: "postgresql://••••@db.railway.app:5432/encore",
    status: "CONNECTED",
    migrations: 5,
    lastMigratedAt: "2026-06-09",
    schemaPath: "shopify/encore/prisma/schema.prisma",
  },
};

// ─── Slug resolvers (demo mode) ─────────────────────────────────
// Freshly created apps (engine create flow) aren't in the static fixtures.
// These synthesize a consistent just-scaffolded DRAFT app for any unknown
// slug so every surface renders it — admin control center on :3001 and the
// app's own panel on [slug].nova-platform.localhost:3003.
// Phase 2/E: replaced by the platform API registry.

export function fxAppNameFromSlug(slug: string): string {
  return slug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

/** Deterministic pseudo Shopify app ID so demo screens stay stable per slug. */
export function fxShopifyAppIdFor(slug: string): string {
  let h = 7;
  for (const c of slug) h = (h * 31 + c.charCodeAt(0)) % 9_000_000;
  return String(87_000_000 + h);
}

export function resolveFxApp(slug: string): FxApp {
  const found = FX_APPS.find((a) => a.slug === slug);
  if (found) return found;
  return {
    id: `app_${slug}`,
    slug,
    name: fxAppNameFromSlug(slug),
    tagline: "Newly created app — finish setup to publish",
    description: "",
    iconUrl: null,
    supportEmail: `support+${slug}@nova-apps.dev`,
    status: "DRAFT",
    pricingModel: "FREEMIUM",
    scopes: [],
    webhookTopics: ["app/uninstalled", "app_subscriptions/update", "customers/data_request", "customers/redact", "shop/redact"],
    plans: [{ name: "Growth", amount: 1900, currency: "USD", interval: "EVERY_30_DAYS", trialDays: 14 }],
    listingUrl: null,
    apiKeyMasked: "—",
    activeInstalls: 0,
  };
}

export function resolveFxEngineState(slug: string): FxEngineState {
  return (
    FX_ENGINE_STATE[slug] ?? {
      repoUrl: `github.com/nova-apps/${slug}`,
      clientIdMasked: null, // captured by `shopify app init`; shown once available
      shopifyAppId: fxShopifyAppIdFor(slug),
      latestVersion: null,
      modules: ["backend"],
      // partner_app is engine-automated (amendment 2026-06-11-d) — done at creation.
      checklist: { partner_app: true, distribution: false, billing_tested: false, gdpr_verified: false, listing: false, review: false },
    }
  );
}

export function resolveFxAppDb(slug: string): FxAppDb {
  return (
    FX_APP_DB[slug] ?? {
      envVar: `APP_DB_URL__${slug.replace(/-/g, "_").toUpperCase()}`,
      urlMasked: null,
      status: "NOT_CONFIGURED",
      migrations: 0,
      lastMigratedAt: null,
      schemaPath: `shopify/${slug}/prisma/schema.prisma`,
    }
  );
}

// ─── App blueprint (spec authoring on app-admin) ────────────────
// Engine amendment 2026-06-11-e: each app's skeleton is specced screen-by-screen
// plus backend on its own panel, then exported as a build pack that Claude
// Cowork pulls to implement the Shopify app.
// Grounded in shopify.dev: App Home pages are built from Polaris page patterns —
// templates (homepage, settings, resource index/detail) + compositions (setup
// guide, data table, empty state) — with App Bridge title-bar actions; other
// surfaces are extension targets. Backend = React Router app + per-app Prisma DB.

export type FxSpecSurface =
  | "app-home" | "admin-ext" | "theme-ext" | "checkout" | "customer-accounts" | "flow" | "pos";
export type FxSpecTemplate = "homepage" | "settings" | "index" | "detail" | "wizard" | "custom";

export interface FxScreenSection {
  title: string;
  /** Polaris pattern/composition, e.g. setup-guide, data-table, form, empty-state. */
  composition: string;
  /** Polaris web components used, e.g. s-section, s-data-table, s-banner. */
  components: string[];
  /** What it shows — copy intent, columns, fields. */
  content: string;
  /** Data powering the section: app DB reads/writes and Admin GraphQL calls. */
  data?: string;
}

export interface FxScreenSpec {
  key: string;
  name: string;
  surface: FxSpecSurface;
  template: FxSpecTemplate;
  /** app-home: React Router route. Extensions: target (e.g. theme block name). */
  route: string;
  purpose: string;
  /** App Bridge title-bar primary action (app-home only). */
  primaryAction?: string;
  secondaryActions?: string[];
  sections: FxScreenSection[];
  emptyState?: string;
  loadingState?: string;
  errorState?: string;
  acceptance: string[];
  status: "DRAFT" | "READY";
}

export interface FxEntityField { name: string; type: string; required: boolean; note?: string }
export interface FxEntitySpec {
  name: string;
  purpose: string;
  fields: FxEntityField[];
  relations?: string[];
}
export interface FxEndpointSpec {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  purpose: string;
  auth: "session-token" | "webhook-hmac" | "public";
  reads?: string;
  writes?: string;
}
export interface FxWebhookSpec { topic: string; handler: string; writes?: string }
export interface FxJobSpec { name: string; schedule: string; behavior: string }

/** External system the app integrates with (e.g. the ARRS recovery engine) — feeds the build pack. */
export interface FxIntegration {
  name: string;
  purpose: string;
  direction?: "outbound" | "inbound" | "bidirectional";
  /** Env vars the app needs for this integration. */
  env?: string[];
  /** Event names / payloads exchanged. */
  events?: string[];
}

/** A delivery phase — a checkable unit of work gated by its acceptance (spec §16 maps here). */
export interface FxPhase {
  number: number;
  name: string;
  goal: string;
  /** Backend/wiring scope for the phase (prose). */
  scope: string;
  /** Blocking spikes to resolve before the phase exits (mostly Phase 0). */
  spikes?: string[];
  /** Screen keys delivered in this phase (drives screen→phase annotation). */
  screens?: string[];
  /** Gate — the phase is complete only when EVERY item is verified from real code + the Nova platform. */
  gate: string[];
}

export interface FxAppSpec {
  appSlug: string;
  summary: { problem: string; user: string; outcome: string };
  screens: FxScreenSpec[];
  backend: {
    entities: FxEntitySpec[];
    endpoints: FxEndpointSpec[];
    webhooks: FxWebhookSpec[];
    jobs: FxJobSpec[];
    /** Admin GraphQL objects the app reads/writes (drives scopes). */
    adminApi: string[];
  };
  /** External integrations beyond Shopify + the Nova platform (rendered in the build pack). */
  integrations?: FxIntegration[];
  /** "Must never" guarantees — the app-level definition of done (build pack reliability bar). */
  reliabilityBar?: string[];
  /** Phased delivery plan — each phase gated; later phases never reopen an earlier phase's contracts. */
  phases?: FxPhase[];
  updatedAt: string;
}

export const FX_APP_SPECS: Record<string, FxAppSpec> = {

  "encore": {
    appSlug: "encore",
    summary: {
      problem:
        "EU fashion and footwear brands run constant drops and restocks with limited inventory across multiple markets, and lose revenue three ways: sold-out products stop capturing demand, stock lands in one market before another (but stores can't sell 'in-stock here, preorder there'), and incumbent preorder apps are unreliable — they oversell, drop order tags, and break site-wide discounts.",
      user:
        "EU DTC fashion, footwear, jewelry and accessories brands on Shopify (Basic→Plus) selling across multiple markets and currencies. The operator/founder enables it in minutes; merchandising/ops consumes the order tags, ship dates, and demand signal.",
      outcome:
        "Enable preorder or a back-in-stock waitlist on any product in under two minutes — never oversell, never lose a tag, correct inside existing discounts, preorder by market, and captured demand flows into ARRS recovery that converts better than a generic back-in-stock email.",
    },
    screens: [
      {
        key: "home",
        name: "Dashboard",
        surface: "app-home",
        template: "homepage",
        route: "/app",
        purpose: "First screen after install — the 2-minute setup state plus the reliability and recovery metrics that prove value.",
        primaryAction: "Enable preorder",
        secondaryActions: ["Scan catalog"],
        sections: [
          { title: "Setup guide", composition: "setup-guide", components: ["s-section", "s-banner"], content: "3 steps: scan the catalog for out-of-stock products, enable preorder/waitlist on the first one, add the storefront block in the theme. Collapses when complete.", data: "reads AppSettings.onboarding; theme-embed status via Admin API themes" },
          { title: "Reliability bar", composition: "stat-row", components: ["s-section", "s-stack", "s-badge"], content: "Oversell incidents (must be 0), untagged orders (must be 0), waitlist delivery rate. Green when clean — the switching trigger vs incumbents.", data: "reads PreorderConfig.soldCount vs preorderLimit, order-tag audit, WaitlistEntry delivery" },
          { title: "Captured demand", composition: "stat-row", components: ["s-section", "s-stack"], content: "Preorders captured 30d, deposits collected, waitlist signups, recovered revenue (ARRS). Delta vs previous period.", data: "reads DemandSignal, ChargeSchedule, WaitlistEntry; ARRS recovery events" },
          { title: "Recent preorders", composition: "data-table", components: ["s-data-table", "s-badge"], content: "Product, market, payment type, ship date, status. Row → product setup.", data: "reads PreorderConfig + orders (Admin GraphQL)" },
        ],
        emptyState: "No preorders yet → 'Scan catalog' CTA plus the 3-step setup guide.",
        loadingState: "Skeleton stat rows + 5 skeleton table rows.",
        errorState: "s-banner critical with retry if the metrics query fails.",
        acceptance: [
          "Loads under 1s on a warm session (Built for Shopify performance bar)",
          "Oversell and untagged-order counters read 0, sourced from real audits not estimates",
          "Setup guide reflects real theme-embed status via the Admin API themes check",
          "All figures localized to the store's primary currency",
        ],
        status: "READY",
      },
      {
        key: "products",
        name: "Products & OOS scanner",
        surface: "app-home",
        template: "index",
        route: "/app/products",
        purpose: "Auto-detect out-of-stock / zero-inventory variants and enable preorder or waitlist in one click — individually or in bulk.",
        primaryAction: "Enable for all out-of-stock",
        secondaryActions: ["Rescan catalog", "Filter by market"],
        sections: [
          { title: "Out-of-stock list", composition: "data-table", components: ["s-data-table", "s-badge", "s-button"], content: "Columns: product, variant/size, inventory by location, current mode (off/preorder/waitlist), markets. Row action: Enable preorder / Enable waitlist. Bulk: enable for all OOS.", data: "reads products + inventoryLevels (Admin GraphQL); writes PreorderConfig (single + bulk)" },
        ],
        emptyState: "Everything's in stock → 'No out-of-stock products right now' with a note that Encore watches for new sell-outs.",
        loadingState: "Skeleton table while the catalog scan runs.",
        errorState: "s-banner if the catalog scan or inventory read fails; partial results flagged, never silently incomplete.",
        acceptance: [
          "Scan flags every zero/negative inventory variant across all locations",
          "One-click enable applies sane defaults and never enables preorder where sellable stock exists for that market",
          "Bulk enable is idempotent — re-running doesn't duplicate configs or selling plans",
          "Cursor pagination at 50/page",
        ],
        status: "READY",
      },
      {
        key: "product-setup",
        name: "Preorder setup",
        surface: "app-home",
        template: "detail",
        route: "/app/products/:id",
        purpose: "Configure preorder/waitlist for one product: mode, payment, deposit, ship date, badge/message, and limit — with a live storefront preview.",
        primaryAction: "Save (App Bridge save bar on dirty state)",
        secondaryActions: ["Disable", "Preview on storefront"],
        sections: [
          { title: "Mode", composition: "form", components: ["s-section", "s-choice-list"], content: "Preorder · Waitlist · Off. Optional per-variant override.", data: "writes PreorderConfig.mode" },
          { title: "Payment", composition: "form", components: ["s-section", "s-choice-list", "s-text-field", "s-banner"], content: "Pay now · Deposit (% or fixed) · Charge later. Capability banner offers the fallback if Shop Pay/Shopify Payments is missing.", data: "writes PreorderConfig.paymentType/depositType/depositValue; reads Shop.paymentCapability; Admin sellingPlanGroupCreate on save" },
          { title: "Ship date & messaging", composition: "form", components: ["s-section", "s-text-field", "s-date-picker"], content: "Promised ship date (→ order/line metafield), badge text, ship-date message. Localized.", data: "writes PreorderConfig.shipDate/badgeText/messageText" },
          { title: "Limit", composition: "form", components: ["s-section", "s-text-field"], content: "Preorder unit limit (no-oversell). Shows units sold vs limit.", data: "writes PreorderConfig.preorderLimit; reads soldCount" },
          { title: "Live preview", composition: "summary-card", components: ["s-section"], content: "Renders the storefront block exactly as shoppers see it for the selected market.", data: "client-side render mirroring the theme app block" },
        ],
        loadingState: "Skeleton form with the product header populated.",
        errorState: "Field-level validation; save blocked until valid; selling-plan creation failure shown as a non-destructive banner with retry.",
        acceptance: [
          "Save persists PreorderConfig and creates/links the Shopify selling plan group (SellingPlanRef)",
          "Changing one setting never alters an unrelated one (stable, isolated settings — spec §9.9)",
          "Ship date writes to the order/line metafield consumed by the EU logistics stack",
          "If no supported payment method, charge-later is disabled with a clear fallback — never a broken checkout",
        ],
        status: "READY",
      },
      {
        key: "markets",
        name: "Per-market rules",
        surface: "app-home",
        template: "custom",
        route: "/app/markets",
        purpose: "The flagship control: run a product as in-stock in one market and preorder in another, reconciled against real location inventory — behind a trivial All/Specific toggle.",
        primaryAction: "Save market rules",
        sections: [
          { title: "Scope", composition: "form", components: ["s-section", "s-choice-list"], content: "All markets (default) · Specific markets → pick from the store's Shopify Markets. Plain-language; complexity hidden in code.", data: "reads Markets (Admin GraphQL); writes MarketRule.scope/markets" },
          { title: "Market × inventory matrix", composition: "data-table", components: ["s-data-table", "s-badge"], content: "Per selected market: real sellable stock by location, resulting shopper experience (Buy / Preorder), and any per-market ship-date override. Highlights conflicts where stock exists.", data: "reads inventoryLevels by location + Markets; writes MarketRule.perMarketOverrides" },
          { title: "Reconciliation note", composition: "banner", components: ["s-section", "s-banner"], content: "Explains that Encore never shows preorder in a market that has sellable stock; auto-reconciled when inventory changes. Shows last reconcile time.", data: "static guidance + last inventory-reconcile timestamp" },
        ],
        emptyState: "Single-market store → 'You sell in one market; per-market rules aren't needed yet.'",
        loadingState: "Skeleton matrix while Markets + inventory load.",
        errorState: "Banner if Markets or inventory is unavailable; saving rules is disabled until resolved.",
        acceptance: [
          "A buyer in a market with stock sees normal purchase; a buyer in a market without sees preorder — same product",
          "The app never shows preorder in a market that has sellable stock for that market (negative test passes)",
          "Market rules survive inventory and Markets changes via the reconciliation job",
          "Merchant UI exposes only All/Specific + the matrix — no raw Shopify flags",
        ],
        status: "READY",
      },
      {
        key: "payments",
        name: "Payments & fallback",
        surface: "app-home",
        template: "settings",
        route: "/app/settings/payments",
        purpose: "Configure selling-plan payment options store-wide and verify the payment-method dependency, with a graceful fallback when deferred flows aren't supported.",
        sections: [
          { title: "Capability check", composition: "banner", components: ["s-section", "s-banner"], content: "Detects Shop Pay / Shopify Payments. Present → pay-now, deposit, charge-later. Absent (Viva.com/Mollie/Klarna-gateway) → deposit-only / pay-now fallback, explained.", data: "reads Shop.paymentCapability (detected at install + re-checkable)" },
          { title: "EU BNPL", composition: "form", components: ["s-section", "s-checkbox"], content: "Allow Scalapay / Klarna / seQura as a deposit/payment method where the store supports it.", data: "writes AppSettings.defaults.bnpl" },
          { title: "Defaults", composition: "form", components: ["s-section", "s-choice-list", "s-text-field"], content: "Default payment type and deposit % applied on one-click enable.", data: "writes AppSettings.defaults.payment" },
        ],
        acceptance: [
          "Capability detection is accurate and re-checkable; never offers a deferred flow the store can't honor",
          "Fallback selection is explained in plain language — never a broken checkout (spec §13)",
          "Defaults apply to subsequent one-click enables without touching existing configs",
        ],
        status: "READY",
      },
      {
        key: "waitlist",
        name: "Waitlist",
        surface: "app-home",
        template: "index",
        route: "/app/waitlist",
        purpose: "Back-in-stock signups by product/variant, their ARRS recovery status, and restock-recovery delivery — proof the waitlist is behavioural recovery, not a dumb list.",
        secondaryActions: ["Export (GDPR-safe)"],
        sections: [
          { title: "Signups", composition: "data-table", components: ["s-data-table", "s-badge"], content: "Product, variant/size, market, signups, ARRS status (pending/emitted/recovered), last restock fire. Row → variant detail.", data: "reads WaitlistEntry aggregated; ARRS event status" },
          { title: "Recovery performance", composition: "stat-row", components: ["s-section", "s-stack"], content: "Waitlist→purchase conversion vs the baseline generic back-in-stock email — the ARRS lift, the core differentiator metric (spec §15).", data: "reads ARRS recovery outcomes vs a baseline cohort" },
        ],
        emptyState: "No signups yet → note that the storefront waitlist form feeds ARRS automatically.",
        loadingState: "Skeleton stats + table.",
        errorState: "Banner if the ARRS status read fails; signups still listed.",
        acceptance: [
          "Every signup shows an accurate ARRS event status; failures are visible, not silent (spec §13)",
          "A configured back-in-stock notification never silently fails to fire",
          "Recovery lift is computed against a real baseline cohort, not a vanity number",
          "Export respects GDPR consent and excludes unconsented contacts",
        ],
        status: "READY",
      },
      {
        key: "demand",
        name: "Demand signal",
        surface: "app-home",
        template: "index",
        route: "/app/demand",
        purpose: "Read-only demand view — how many shoppers want each product by variant, size, and market — to size reorders. A signal, not a forecast (spec §9.11; Non-Goal §6.2).",
        secondaryActions: ["Export CSV"],
        sections: [
          { title: "Demand by variant", composition: "data-table", components: ["s-data-table"], content: "Product, variant, size, market, interested shoppers (preorder intent + waitlist). Sort by demand; filter by market.", data: "reads DemandSignal (nightly rollup)" },
          { title: "Size curve", composition: "chart", components: ["s-section"], content: "Distribution of demand across sizes for the selected product — the reorder-depth view merchandisers ask for.", data: "reads DemandSignal grouped by size" },
        ],
        emptyState: "No demand captured yet → enable preorder/waitlist to start collecting the signal.",
        loadingState: "Skeleton table + chart.",
        acceptance: [
          "Counts reconcile with preorder intent + waitlist signups within the selected period",
          "Read-only — no forecasting, ordering, or write actions (Non-Goal §6.2 honored)",
          "Size and market breakdowns are correct and exportable",
        ],
        status: "READY",
      },
      {
        key: "settings",
        name: "Settings",
        surface: "app-home",
        template: "settings",
        route: "/app/settings",
        purpose: "Store-wide defaults, localization, discount-compatibility verification, and GDPR/data retention — all isolated and predictable.",
        sections: [
          { title: "Defaults", composition: "form", components: ["s-section", "s-text-field"], content: "Default badge text, ship-date placeholder, deposit %. Used on one-click enable.", data: "writes AppSettings.defaults" },
          { title: "Localization", composition: "form", components: ["s-section", "s-choice-list"], content: "Storefront strings per active locale; coexists with Translate & Adapt / langify / T Lab. No hard-coded text.", data: "writes AppSettings.i18n" },
          { title: "Discount compatibility", composition: "checklist", components: ["s-section", "s-banner"], content: "Verifies preorder items behave inside automatic discounts, codes, and Buy-X-Get-Y. Shows the last verification result.", data: "reads discount-compatibility test results (Admin GraphQL price rules)" },
          { title: "Data & GDPR", composition: "form", components: ["s-section", "s-checkbox"], content: "Waitlist consent copy per locale, retention window, delete-on-request. Purge on uninstall.", data: "writes AppSettings.defaults.gdpr" },
        ],
        acceptance: [
          "Settings persist per shop and changing one never alters another (spec §9.9)",
          "Preorder items apply site-wide discounts correctly across automatic, code, and Buy-X-Get-Y (spec §9.6)",
          "No untranslated or broken storefront text on a multilingual store (spec §9.8)",
          "Save bar appears only on a dirty state",
        ],
        status: "READY",
      },
      {
        key: "preorder-block",
        name: "Preorder block (storefront)",
        surface: "theme-ext",
        template: "custom",
        route: "blocks/preorder-button.liquid (app block)",
        purpose: "The shopper-facing preorder button, badge, and ship-date message — injected as a theme app block, localized and per-market aware.",
        sections: [
          { title: "Preorder CTA", composition: "app-block", components: ["theme app extension block"], content: "Preorder button (replaces Add to cart on OOS/upcoming), badge, localized ship-date message. Applies the selling plan; respects the per-market rule. Inherits theme typography.", data: "reads preorder eligibility (market × inventory) via app proxy /apps/encore/preorder" },
        ],
        acceptance: [
          "No theme code edits — placed via the theme customizer (App Store rule, spec §8.2)",
          "CLS-safe: reserves height before hydration; meets Built for Shopify performance",
          "Renders the correct state per buyer market (Buy vs Preorder), reconciled to live inventory",
          "All strings localized to the active storefront locale and currency (WCAG 2.1 AA)",
        ],
        status: "READY",
      },
      {
        key: "waitlist-form",
        name: "Waitlist form (storefront)",
        surface: "theme-ext",
        template: "custom",
        route: "blocks/waitlist-form.liquid (app block / app embed)",
        purpose: "Back-in-stock capture form on out-of-stock products without preorder — feeds ARRS with GDPR consent.",
        sections: [
          { title: "Waitlist form", composition: "app-block", components: ["theme app extension block"], content: "Email capture with explicit GDPR consent, localized. Confirms signup; emits the capture event to ARRS.", data: "writes WaitlistEntry via app proxy /apps/encore/waitlist; emits ARRS event" },
        ],
        acceptance: [
          "No theme code edits; placeable/embeddable via the theme customizer",
          "Captures explicit consent before storing the contact (spec §12 GDPR)",
          "Signup reliably emits an ARRS event; failures retried, never silently dropped (spec §13)",
          "Localized strings + accessible form labels (WCAG 2.1 AA)",
        ],
        status: "READY",
      },
      {
        key: "flow",
        name: "Flow connectors",
        surface: "flow",
        template: "custom",
        route: "flow/ (triggers + actions)",
        purpose: "Make Encore a node in merchants' Shopify Flow — triggers for preorder/waitlist/restock events and an action to emit an ARRS event.",
        sections: [
          { title: "Triggers", composition: "flow-trigger", components: ["Flow trigger"], content: "Preorder placed · Waitlist signup · Restock detected. Payload: product, variant, market, ship date.", data: "emitted from webhook handlers + jobs" },
          { title: "Actions", composition: "flow-action", components: ["Flow action"], content: "Tag order · Emit ARRS recovery event. Lets merchants extend Encore without code.", data: "writes order tags (Admin); emits ARRS event" },
        ],
        acceptance: [
          "Triggers fire with complete, correctly-typed payloads",
          "Action steps are idempotent and safe to retry within a Flow",
        ],
        status: "READY",
      },
      {
        key: "customer-account",
        name: "Customer account — My preorders",
        surface: "customer-accounts",
        template: "custom",
        route: "customer-account/ (UI extension block)",
        purpose: "Shoppers see their preorders (ship date, balance due for charge-later) and waitlist items in their account — and the GA return path toward the P2 MCP close.",
        sections: [
          { title: "My preorders", composition: "account-block", components: ["customer account UI block"], content: "The shopper's preorders: product, ship date, amount paid, balance due. Localized.", data: "reads orders + ChargeSchedule for the signed-in customer" },
          { title: "My waitlist", composition: "account-block", components: ["customer account UI block"], content: "Items the shopper is waiting on + restock status. A return link the future MCP agent can rebuild the cart from (architect-for, spec §8.4 P2).", data: "reads WaitlistEntry for the customer" },
        ],
        acceptance: [
          "Shows accurate ship dates and balance-due for the signed-in customer only",
          "Built on GA Customer Account surfaces; no dependency on Checkout MCP (preview)",
          "Return links are structured so the P2 MCP flow can be added without rework",
        ],
        status: "READY",
      },
    ],
    backend: {
      entities: [
        {
          name: "Shop",
          purpose: "One row per installed shop; anchors all app data and the payment-capability detection.",
          fields: [
            { name: "id", type: "String @id @default(cuid())", required: true },
            { name: "shopDomain", type: "String @unique", required: true },
            { name: "accessTokenEnc", type: "String", required: true, note: "encrypted offline token" },
            { name: "paymentCapability", type: "Json?", required: false, note: "Shop Pay/Shopify Payments detection → fallback (§8.1, §9.3)" },
            { name: "installedAt", type: "DateTime @default(now())", required: true },
          ],
          relations: ["Shop 1—n PreorderConfig", "Shop 1—n WaitlistEntry", "Shop 1—n ChargeSchedule", "Shop 1—1 AppSettings"],
        },
        {
          name: "PreorderConfig",
          purpose: "Per product/variant preorder or waitlist configuration (spec §10).",
          fields: [
            { name: "id", type: "String @id @default(cuid())", required: true },
            { name: "shopId", type: "String", required: true, note: "shop-scoped (GDPR purge key)" },
            { name: "productGid", type: "String", required: true },
            { name: "variantGid", type: "String?", required: false, note: "null = whole product" },
            { name: "mode", type: "PREORDER | WAITLIST | OFF", required: true },
            { name: "paymentType", type: "PAY_NOW | DEPOSIT | CHARGE_LATER", required: true },
            { name: "depositType", type: "PERCENT | FIXED ?", required: false },
            { name: "depositValue", type: "Int? (bps or minor units)", required: false },
            { name: "shipDate", type: "DateTime?", required: false, note: "→ order/line metafield for EU logistics" },
            { name: "badgeText", type: "String?", required: false },
            { name: "messageText", type: "String?", required: false },
            { name: "preorderLimit", type: "Int?", required: false, note: "no-oversell cap (§9.4)" },
            { name: "soldCount", type: "Int @default(0)", required: true },
            { name: "status", type: "ACTIVE | PAUSED | DRAFT", required: true },
          ],
          relations: ["Shop 1—n PreorderConfig", "PreorderConfig 1—1 MarketRule", "PreorderConfig 1—n SellingPlanRef", "@@unique([shopId, productGid, variantGid])"],
        },
        {
          name: "MarketRule",
          purpose: "Per-config market scoping — the flagship 'in-stock here, preorder there' rule (§8.3, §9.2).",
          fields: [
            { name: "id", type: "String @id @default(cuid())", required: true },
            { name: "shopId", type: "String", required: true, note: "shop-scoped" },
            { name: "preorderConfigId", type: "String @unique", required: true },
            { name: "scope", type: "ALL | SPECIFIC", required: true },
            { name: "markets", type: "String[]", required: true, note: "Shopify Market handles when SPECIFIC" },
            { name: "perMarketOverrides", type: "Json?", required: false, note: "ship-date/deposit/badge by market" },
          ],
          relations: ["PreorderConfig 1—1 MarketRule"],
        },
        {
          name: "SellingPlanRef",
          purpose: "Maps a config to the Shopify selling plan group/plan it created — we build on the Selling Plan API, not reinvent payments (§8.1, §10).",
          fields: [
            { name: "id", type: "String @id @default(cuid())", required: true },
            { name: "shopId", type: "String", required: true, note: "shop-scoped" },
            { name: "preorderConfigId", type: "String", required: true },
            { name: "sellingPlanGroupGid", type: "String", required: true },
            { name: "sellingPlanGid", type: "String", required: true },
            { name: "planKind", type: "String", required: true, note: "pay-now | deposit | charge-later" },
          ],
          relations: ["PreorderConfig 1—n SellingPlanRef", "@@unique([shopId, sellingPlanGid])"],
        },
        {
          name: "WaitlistEntry",
          purpose: "Back-in-stock capture → emitted to ARRS (§8.4, §9.7). Holds PII (email); GDPR consent captured, purged on redact.",
          fields: [
            { name: "id", type: "String @id @default(cuid())", required: true },
            { name: "shopId", type: "String", required: true, note: "shop-scoped (GDPR purge key)" },
            { name: "productGid", type: "String", required: true },
            { name: "variantGid", type: "String", required: true },
            { name: "email", type: "String", required: true, note: "PII" },
            { name: "market", type: "String?", required: false },
            { name: "locale", type: "String?", required: false },
            { name: "consentAt", type: "DateTime?", required: false, note: "explicit GDPR consent at capture" },
            { name: "arrsEventStatus", type: "PENDING | EMITTED | RECOVERED | FAILED", required: true },
            { name: "notifiedAt", type: "DateTime?", required: false, note: "set on confirmed delivery (§13)" },
          ],
          relations: ["Shop 1—n WaitlistEntry", "@@unique([shopId, variantGid, email])"],
        },
        {
          name: "ChargeSchedule",
          purpose: "Charge-later balance collection (spec §10, §11). Idempotent + auditable: append-only retry log, retry-safe (§13).",
          fields: [
            { name: "id", type: "String @id @default(cuid())", required: true },
            { name: "shopId", type: "String", required: true, note: "shop-scoped" },
            { name: "orderGid", type: "String", required: true },
            { name: "balanceAmount", type: "Int (minor units)", required: true },
            { name: "currency", type: "String", required: true },
            { name: "dueTrigger", type: "DATE | ON_FULFILLMENT", required: true },
            { name: "dueAt", type: "DateTime?", required: false },
            { name: "state", type: "SCHEDULED | COLLECTED | FAILED | CANCELLED", required: true },
            { name: "retryLog", type: "Json? (append-only)", required: false },
          ],
          relations: ["Shop 1—n ChargeSchedule", "@@unique([shopId, orderGid])"],
        },
        {
          name: "DemandSignal",
          purpose: "Derived demand by product/variant/size/market (spec §10, §9.11). Read-only signal to size reorders; not a forecast.",
          fields: [
            { name: "id", type: "String @id @default(cuid())", required: true },
            { name: "shopId", type: "String", required: true, note: "shop-scoped" },
            { name: "productGid", type: "String", required: true },
            { name: "variantGid", type: "String", required: true },
            { name: "size", type: "String?", required: false, note: "reorder-depth dimension" },
            { name: "market", type: "String?", required: false },
            { name: "interestCount", type: "Int @default(0)", required: true },
          ],
          relations: ["derived — nightly rollup", "@@unique([shopId, variantGid, market])"],
        },
        {
          name: "AppSettings",
          purpose: "Per-shop defaults, payment capability, pricing plan, i18n, onboarding (spec §10).",
          fields: [
            { name: "id", type: "String @id @default(cuid())", required: true },
            { name: "shopId", type: "String @unique", required: true },
            { name: "defaults", type: "Json", required: true, note: "badge/ship-date/deposit defaults, bnpl, gdpr" },
            { name: "pricingPlan", type: "String?", required: false, note: "mirrors platform AppPlan for gating" },
            { name: "i18n", type: "Json?", required: false, note: "externalized storefront strings per locale" },
            { name: "onboarding", type: "Json", required: true, note: "2-minute setup progress" },
          ],
          relations: ["Shop 1—1 AppSettings"],
        },
      ],
      endpoints: [
        { method: "GET", path: "/app/* (loaders)", purpose: "Screen data for App Home pages", auth: "session-token", reads: "PreorderConfig, MarketRule, WaitlistEntry, DemandSignal, ChargeSchedule, AppSettings" },
        { method: "POST", path: "/app/products/:id (action)", purpose: "Save preorder/waitlist config + create/link selling plan group", auth: "session-token", writes: "PreorderConfig, SellingPlanRef, MarketRule; Admin sellingPlanGroupCreate" },
        { method: "POST", path: "/app/products/bulk-enable (action)", purpose: "Enable preorder for all OOS variants with defaults (idempotent)", auth: "session-token", writes: "PreorderConfig (bulk)" },
        { method: "POST", path: "/app/markets (action)", purpose: "Save per-market rules", auth: "session-token", writes: "MarketRule" },
        { method: "POST", path: "/app/settings (action)", purpose: "Save defaults / localization / GDPR", auth: "session-token", writes: "AppSettings" },
        { method: "POST", path: "/apps/encore/preorder (app proxy)", purpose: "Storefront block fetches preorder eligibility (market × inventory) for a product", auth: "public", reads: "PreorderConfig (ACTIVE), inventory by location" },
        { method: "POST", path: "/apps/encore/waitlist (app proxy)", purpose: "Storefront waitlist signup → store + emit ARRS event", auth: "public", writes: "WaitlistEntry" },
        { method: "POST", path: "/api/webhooks", purpose: "Webhook receiver (HMAC verified), fans out by topic", auth: "webhook-hmac", writes: "see webhooks" },
      ],
      webhooks: [
        { topic: "orders/create", handler: "Detect preorder line properties; tag order + line 'preorder' (idempotent, verified post-write); write ship-date metafield; increment DemandSignal; emit preorder-intent to ARRS.", writes: "order tags/metafields (Admin), DemandSignal" },
        { topic: "orders/paid", handler: "For deposit / charge-later, create or confirm the ChargeSchedule from the selling-plan mandate.", writes: "ChargeSchedule" },
        { topic: "inventory_levels/update", handler: "Restock detection: fire ARRS recovery for waitlisted variants back in stock for a market; reconcile preorder eligibility; enforce no-oversell.", writes: "WaitlistEntry, PreorderConfig" },
        { topic: "products/update", handler: "Re-scan OOS state; keep PreorderConfig + selling plans in sync with variant changes.", writes: "PreorderConfig" },
        { topic: "app/uninstalled", handler: "Mark shop uninstalled, schedule data purge, forward to platform ingress.", writes: "Shop" },
        { topic: "app_subscriptions/update", handler: "Forward to platform ingress (billing source of truth).", writes: "—" },
        { topic: "customers/data_request | customers/redact | shop/redact", handler: "GDPR: export/purge waitlist PII by shopId/email; always 200 within 5s.", writes: "all shop-scoped tables" },
      ],
      jobs: [
        { name: "charge-later-collect", schedule: "hourly", behavior: "Collect due balances via the vaulted mandate; idempotent + retry-safe; append to retryLog. Sends balance-due reminder w/ payment link where configured (P1)." },
        { name: "waitlist-dispatch", schedule: "every 5 min", behavior: "Durable queue: deliver back-in-stock recovery via ARRS; confirm delivery and set notifiedAt — never best-effort (§13)." },
        { name: "inventory-reconcile", schedule: "every 15 min", behavior: "Reconcile preorder eligibility vs real location inventory per market; flip Buy/Preorder states; guard the no-oversell limit." },
        { name: "demand-rollup", schedule: "daily 02:00 shop-local", behavior: "Aggregate preorder intent + waitlist into DemandSignal by variant/size/market." },
        { name: "purge-uninstalled", schedule: "daily", behavior: "Hard-delete shop data 48h after uninstall (GDPR)." },
      ],
      adminApi: [
        "sellingPlanGroups (write — create/attach preorder selling plans)",
        "products / productVariants (read; write inventoryPolicy for continue-selling)",
        "inventoryLevels / locations (read — per-market reconciliation)",
        "markets (read — buyer market context)",
        "orders (write — preorder tags) + metafields (write — ship date)",
        "priceRules / discounts (read — discount-compatibility verification)",
        "appSubscription (billing)",
      ],
    },
    integrations: [
      {
        name: "ARRS recovery engine",
        purpose: "Encore owns demand capture; ARRS owns recovery. Waitlist/preorder/abandonment signals are emitted as events; ARRS applies behavioural segmentation + localized AI recovery (the differentiator vs a generic back-in-stock email).",
        direction: "outbound",
        env: ["ARRS_API_BASE", "ARRS_API_KEY"],
        events: ["waitlist.signup", "preorder.intent", "preorder.cart_abandoned", "restock.detected"],
      },
    ],
    reliabilityBar: [
      "Never oversell beyond the configured preorder limit",
      "A preorder/backorder order is never created untagged",
      "Preorder items never silently break a store's discounts",
      "Changing one setting never alters an unrelated setting",
      "A configured back-in-stock notification never silently fails to fire",
      "Never a broken checkout when a payment method is unsupported (graceful fallback)",
      "Never continue billing after uninstall",
    ],
    phases: [
      {
        number: 0,
        name: "Foundation & feasibility",
        goal: "A scaffolded, authenticated, Nova-wired app shell — and the two blocking spikes resolved before any feature is built.",
        scope: "shopify app init (React Router) · token-exchange auth · scopes + app proxy + webhook subscriptions in shopify.app.toml · per-app Postgres (Shop, AppSettings) migrated · Nova install-confirm callback + webhook forwarding to ingress.",
        spikes: [
          "Per-market selling plans: prove in-stock in one market + preorder in another, reconciled to real location inventory (blocks Phase 2).",
          "Payment-method dependency: confirm Shop Pay / Shopify Payments requirement for deferred/charge-later and prove the deposit-only / pay-now fallback (blocks Phase 1).",
        ],
        screens: [],
        gate: [
          "App scaffolded (React Router); shopify.app.toml carries the 9 scopes, app proxy /apps/encore, and all webhook subscriptions incl. the GDPR three",
          "Embedded auth via token exchange works; Encore installs on the EU multi-market dev store",
          "Per-app Postgres migrated against APP_DB_URL__ENCORE; Shop + AppSettings tables exist",
          "Nova install-confirm callback implemented — the platform shows the Installation ACTIVE for the dev store",
          "Webhook forwarding to {NOVA_API}/v1/webhooks/shopify/encore verified — a lifecycle/GDPR event lands in the platform ingress log",
          "SPIKE PASSED: per-market selling-plan mechanism (Buy in a market with stock, Preorder in one without; never preorder where sellable stock exists)",
          "SPIKE PASSED: payment-method fallback proven on a non-Shopify-Payments store — never a broken checkout",
        ],
      },
      {
        number: 1,
        name: "Core preorder (P0 mechanics)",
        goal: "A merchant can enable preorder on an OOS product in under 2 minutes — no oversell, always tagged, ships-date correct.",
        scope: "Selling-plan creation (SellingPlanRef) · ChargeSchedule · webhooks orders/create (tag + ship-date metafield + demand), orders/paid (deposit/charge-later), products/update.",
        screens: ["home", "products", "product-setup", "payments", "settings", "preorder-block"],
        gate: [
          "OOS scanner flags every zero/negative-inventory variant; one-click + bulk enable apply sane defaults (idempotent)",
          "Selling plan group created/linked per config; pay-now / deposit / charge-later all configurable",
          "No-oversell: the preorder limit is enforced — product reverts to sold-out/waitlist at the cap with no error",
          "Every preorder/backorder line is tagged 100% (verified post-write); ship-date written to the order/line metafield; clear preorder confirmation to the customer",
          "Storefront preorder block placeable via the theme customizer (no code edits), CLS-safe",
          "Stable settings: changing one setting never alters an unrelated one",
        ],
      },
      {
        number: 2,
        name: "The wedge (P0 differentiators)",
        goal: "The reasons to switch: per-market preorder, discount compatibility, localization, and the demand signal.",
        scope: "MarketRule · DemandSignal · jobs inventory-reconcile + demand-rollup · inventory_levels/update (per-market reconciliation). Settings gains localization + discount-compatibility verification.",
        screens: ["markets", "demand"],
        gate: [
          "Per-market: a market with stock shows Buy, one without shows Preorder — same product, reconciled to location inventory; the negative test (never preorder where sellable stock exists) passes",
          "Discount compatibility verified against automatic discounts, discount codes, and Buy-X-Get-Y",
          "Shopper localization: badge / ship-date / waitlist text render in active languages + currencies; no untranslated or broken text on a multilingual store",
          "Demand-signal view shows interest by variant / size / market (read-only) and reconciles with preorder intent + waitlist",
          "Flat pricing surfaced; billing stops on uninstall",
        ],
      },
      {
        number: 3,
        name: "Waitlist + ARRS",
        goal: "Back-in-stock capture flows into ARRS behavioural recovery — the core differentiator vs a generic email.",
        scope: "WaitlistEntry · waitlist-dispatch job · inventory_levels/update (restock fire) · ARRS event integration · Flow + Customer Account surfaces.",
        screens: ["waitlist", "waitlist-form", "flow", "customer-account"],
        gate: [
          "Waitlist captures contact + variant interest with explicit GDPR consent → emitted to ARRS (status visible, never silently dropped)",
          "On restock, the recovery flow fires reliably (delivery confirmed, notifiedAt set)",
          "Flow triggers (preorder placed / waitlist signup / restock) fire with correct payloads; actions are idempotent",
          "Customer account shows the shopper's preorders (ship date, balance due) + waitlist; GA surfaces only (no Checkout MCP)",
        ],
      },
      {
        number: 4,
        name: "Reliability hardening & BFS",
        goal: "Every 'must never' guarantee proven; Built for Shopify standard met.",
        scope: "Full reliability bar (§7) · theme compatibility matrix · performance/BFS · GDPR/EU compliance (purge-uninstalled job; hardened GDPR handlers; EU-VAT-correct deposits).",
        screens: [],
        gate: [
          "Every reliability-bar item (§ reliability bar) verified",
          "Theme compatibility matrix green on the pilot-store themes; no layout breakage",
          "Performance meets Built for Shopify; the storefront block does not measurably degrade page speed",
          "GDPR: data_request / redact / shop_redact return 200 (401 on bad HMAC) and purge by shopId; purge-uninstalled job runs; deposits are EU-VAT-correct",
        ],
      },
      {
        number: 5,
        name: "Pilot & validation gate",
        goal: "Beat the incumbent on recovered demand on real portfolio stores, then earn the right to open to cold merchants.",
        scope: "Deploy to 2–3 portfolio stores running incumbents · instrument the recovered-demand benchmark · iterate to beat the incumbent.",
        screens: [],
        gate: [
          "Deployed to 2–3 portfolio stores running incumbents; recovered-demand benchmark instrumented",
          "Waitlist→purchase conversion beats the incumbent baseline (the ARRS lift)",
          "Zero oversell incidents; zero untagged-order incidents",
          "Validation gate: ≥10 paying installs from merchants with no prior Nova relationship before opening broadly",
        ],
      },
    ],
    updatedAt: "2026-06-11",
  },
};

/** Blueprint resolver — unknown slugs get a module-aware starter skeleton to spec out. */
export function resolveFxAppSpec(slug: string, modules: string[] = ["backend"]): FxAppSpec {
  const found = FX_APP_SPECS[slug];
  if (found) return found;
  const name = fxAppNameFromSlug(slug);

  const screens: FxScreenSpec[] = [
    {
      key: "home", name: "Dashboard", surface: "app-home", template: "homepage", route: "/app",
      purpose: `First screen after install for ${name} — replace with the app's real value.`,
      primaryAction: "Primary action TBD",
      sections: [
        { title: "Setup guide", composition: "setup-guide", components: ["s-section", "s-banner"], content: "Onboarding steps until first value moment.", data: "reads Settings.onboarding" },
        { title: "Key metrics", composition: "stat-row", components: ["s-section", "s-stack"], content: "2–4 stats proving the app's value.", data: "TBD" },
      ],
      emptyState: "Pre-first-use state with the primary action.",
      loadingState: "Skeleton stats + table.",
      acceptance: ["Loads under 1s (Built for Shopify)", "Setup guide reflects real state"],
      status: "DRAFT",
    },
    {
      key: "settings", name: "Settings", surface: "app-home", template: "settings", route: "/app/settings",
      purpose: "Per-shop configuration.",
      sections: [
        { title: "General", composition: "form", components: ["s-section", "s-text-field"], content: "Fields TBD.", data: "writes Settings" },
      ],
      acceptance: ["Settings persist per shop", "Save bar on dirty state only"],
      status: "DRAFT",
    },
  ];
  if (modules.includes("storefront-widget")) {
    screens.push({
      key: "widget-block", name: "Storefront widget", surface: "theme-ext", template: "custom",
      route: "blocks/widget.liquid (app block)",
      purpose: "Merchant-placeable theme app extension block.",
      sections: [{ title: "Block", composition: "app-block", components: ["theme app extension block"], content: "Content TBD; settings via app embed.", data: "app proxy read" }],
      acceptance: ["No theme code edits", "CLS-safe"],
      status: "DRAFT",
    });
  }
  for (const m of modules.filter((x) => x.startsWith("function-"))) {
    screens.push({
      key: `${m}-config`, name: `${fxAppNameFromSlug(m.replace("function-", ""))} function config`,
      surface: "app-home", template: "custom", route: `/app/${m.replace("function-", "")}`,
      purpose: `Configuration UI for the ${m} Shopify Function.`,
      sections: [{ title: "Rules", composition: "form", components: ["s-section"], content: "Function input config TBD.", data: "writes function config via Admin GraphQL" }],
      acceptance: ["Config round-trips to function input"],
      status: "DRAFT",
    });
  }

  return {
    appSlug: slug,
    summary: {
      problem: "TBD — what merchant pain does this app remove?",
      user: "TBD — who uses it?",
      outcome: "TBD — what changes for the merchant once installed?",
    },
    screens,
    backend: {
      entities: [
        {
          name: "Shop", purpose: "One row per installed shop; anchors all app data.",
          fields: [
            { name: "id", type: "String @id", required: true },
            { name: "domain", type: "String @unique", required: true },
            { name: "accessTokenEnc", type: "String", required: true, note: "encrypted offline token" },
            { name: "installedAt", type: "DateTime", required: true },
          ],
        },
        {
          name: "Settings", purpose: "Per-shop configuration (1:1 Shop).",
          fields: [
            { name: "shopId", type: "String @unique", required: true },
            { name: "onboarding", type: "Json", required: true },
          ],
        },
      ],
      endpoints: [
        { method: "GET", path: "/app/* (loaders)", purpose: "Screen data for App Home pages", auth: "session-token" },
        { method: "POST", path: "/api/webhooks", purpose: "Webhook receiver (HMAC verified)", auth: "webhook-hmac" },
      ],
      webhooks: [
        { topic: "app/uninstalled", handler: "Mark uninstalled, schedule purge, forward to platform ingress", writes: "Shop" },
        { topic: "app_subscriptions/update", handler: "Forward to platform ingress", writes: "—" },
        { topic: "customers/data_request | customers/redact | shop/redact", handler: "GDPR handlers (mandatory)", writes: "shop-scoped tables" },
      ],
      jobs: [],
      adminApi: [],
    },
    updatedAt: "2026-06-11",
  };
}

export function formatMoney(amountMinor: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amountMinor / 100);
}

export function formatRate(bps: number): string {
  return `${(bps / 100).toFixed(2).replace(/\.00$/, "")}%`;
}
