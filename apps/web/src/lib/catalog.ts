/**
 * PLACEHOLDER catalog data — replaced by GET /v1/catalog/apps in Phase 2
 * (spec: docs/03-modules/apps-registry.md). Keep shapes aligned with AppPlan/App.
 */
export interface CatalogApp {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  pricingModel: "FREE" | "FREEMIUM" | "PREMIUM";
  plans: { name: string; price: string; features: string[] }[];
}

export const PLACEHOLDER_APPS: CatalogApp[] = [
  {
    slug: "encore",
    name: "Encore",
    tagline: "Preorder & back-in-stock for EU fashion — per-market, never oversells",
    description:
      "Turn out-of-stock and not-yet-released products into captured demand. Enable preorder or a back-in-stock waitlist on any product in under two minutes — works inside your existing Shopify discounts, never oversells, and supports preorder by market (in-stock here, preorder there).",
    pricingModel: "FREEMIUM",
    plans: [
      { name: "Free", price: "$0", features: ["Back-in-stock waitlist", "Basic preorder"] },
      { name: "Growth", price: "$19/mo", features: ["Per-market rules", "Deposits & charge-later", "Demand signal"] },
      { name: "Scale", price: "$49/mo", features: ["Everything in Growth", "ARRS recovery", "Priority support"] },
    ],
  },
];
