/**
 * Minimal Shopify Partner API client (GraphQL over fetch, no SDK) — the AUTHORITATIVE source of
 * app earnings ("did we actually get paid"). Used by billing reconciliation to true-up the Charge
 * ledger against what Shopify actually collected and will pay out (net of revenue share + fees).
 *
 * Env (set on the Mac / prod, NOT committed):
 *   SHOPIFY_PARTNER_ORG_ID       — numeric org id from the Partner Dashboard URL
 *   SHOPIFY_PARTNER_API_TOKEN    — Partner API client token with "View financials" + "Manage apps"
 *   SHOPIFY_PARTNER_API_VERSION  — optional, defaults below
 *   NOVA_SHOPIFY_APP_GID         — gid://shopify/App/<id> for our app (Encore), to scope queries
 *
 * Docs: https://shopify.dev/docs/api/partner — Transaction types (AppSubscriptionSale, AppOneTimeSale,
 * AppSaleCredit, AppSaleAdjustment) expose grossAmount / netAmount / shopifyFee / processingFee.
 * NOTE: confirm exact field/version names against your Partner API version before enabling writes.
 */

const DEFAULT_VERSION = "2025-01";

export function isPartnerConfigured(): boolean {
  return Boolean(process.env.SHOPIFY_PARTNER_ORG_ID && process.env.SHOPIFY_PARTNER_API_TOKEN);
}

export async function partnerGraphQL<T = any>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const org = process.env.SHOPIFY_PARTNER_ORG_ID;
  const token = process.env.SHOPIFY_PARTNER_API_TOKEN;
  const version = process.env.SHOPIFY_PARTNER_API_VERSION ?? DEFAULT_VERSION;
  if (!org || !token) throw new Error("Shopify Partner API not configured");

  const res = await fetch(`https://partners.shopify.com/${org}/api/${version}/graphql.json`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-shopify-access-token": token },
    body: JSON.stringify({ query, variables }),
  });
  const json = (await res.json()) as { data?: T; errors?: Array<{ message?: string }> };
  if (!res.ok || json.errors?.length) {
    throw new Error(`Partner API: ${json.errors?.map((e) => e.message).join("; ") ?? res.status}`);
  }
  return json.data as T;
}

/** Major-unit decimal string → integer minor units. */
export function partnerMoneyToMinor(amount: string | number | null | undefined): number | null {
  if (amount == null) return null;
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  return isFinite(n) ? Math.round(n * 100) : null;
}

/**
 * One page of app earnings transactions. `appId` scopes to our app; `createdAtMin` bounds the window.
 * Field selection mirrors the documented Transaction interface; adjust per your Partner API version.
 */
export const APP_TRANSACTIONS_QUERY = `#graphql
  query NovaAppTransactions($createdAtMin: DateTime, $after: String) {
    transactions(types: [APP_SUBSCRIPTION_SALE, APP_ONE_TIME_SALE, APP_SALE_CREDIT, APP_SALE_ADJUSTMENT], createdAtMin: $createdAtMin, after: $after) {
      edges {
        cursor
        node {
          __typename
          ... on AppSubscriptionSale { id createdAt grossAmount { amount currencyCode } netAmount { amount currencyCode } shop { myshopifyDomain } app { id } }
          ... on AppOneTimeSale     { id createdAt grossAmount { amount currencyCode } netAmount { amount currencyCode } shop { myshopifyDomain } app { id } }
          ... on AppSaleCredit      { id createdAt grossAmount { amount currencyCode } netAmount { amount currencyCode } shop { myshopifyDomain } app { id } }
          ... on AppSaleAdjustment  { id createdAt grossAmount { amount currencyCode } netAmount { amount currencyCode } shop { myshopifyDomain } app { id } }
        }
      }
      pageInfo { hasNextPage }
    }
  }`;
