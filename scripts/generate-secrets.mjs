#!/usr/bin/env node
/**
 * Generate strong, unique secrets for a real deployment (GO-LIVE-AUDIT P0-3).
 *
 *   node scripts/generate-secrets.mjs            # print to stdout
 *   node scripts/generate-secrets.mjs --write    # write scripts/.env.secrets (gitignored; do NOT commit)
 *
 * SHARED secrets (NOVA_INSTALL_CONFIRM_SECRET, NOVA_INGRESS_HMAC_SECRET) must be set to the SAME value
 * on the Nova API .env AND each app's .env (e.g. shopify/encore/.env). Everything else is Nova-only.
 * Secrets prefixed `from-shopify` are NOT generated here — copy them from the Shopify/Partner dashboards.
 */
import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";

const hex = (n) => randomBytes(n).toString("hex");
const b64 = (n) => randomBytes(n).toString("base64url");

const shared = {
  NOVA_INSTALL_CONFIRM_SECRET: hex(32),
  NOVA_INGRESS_HMAC_SECRET: hex(32),
  NOVA_ENTITLEMENT_SECRET: hex(32),
  NOVA_TOOL_CI_SECRET: hex(32),
  NOVA_BRIDGE_SECRET: hex(32),
};
const platform = {
  JWT_SECRET: b64(48), // ≥ 32 chars
  APP_ENCRYPTION_KEY: hex(32), // 32-byte hex for Shopify credential encryption
  SEED_ADMIN_PASSWORD: b64(18), // rotate the dev default; or remove and set in your secret manager
};

const lines = [
  "# ── Generated " + new Date().toISOString() + " — store in a secret manager, NEVER commit ──",
  "",
  "# SHARED — identical value required on Nova API .env AND each app .env (e.g. shopify/encore/.env)",
  ...Object.entries(shared).map(([k, v]) => `${k}="${v}"`),
  "",
  "# Nova API only",
  ...Object.entries(platform).map(([k, v]) => `${k}="${v}"`),
  "",
  "# Copy from dashboards (not generated):",
  "# SHOPIFY_API_SECRET=...            # Encore app — Shopify Partner dashboard",
  "# SHOPIFY_BRIDGE_SECRET=...         # Nova Store Bridge app",
  "# SHOPIFY_PARTNER_API_TOKEN=...     # Partner API client (View financials + Manage apps)",
  "# STRIPE_SECRET_KEY=...             # Stripe (Tools billing)",
  "# STRIPE_WEBHOOK_SECRET=...         # Stripe webhook endpoint",
  "",
];
const out = lines.join("\n");

if (process.argv.includes("--write")) {
  const path = new URL("./.env.secrets", import.meta.url);
  writeFileSync(path, out);
  console.error(`Wrote ${path.pathname} — move values into your secret manager, then delete this file.`);
} else {
  process.stdout.write(out);
}
