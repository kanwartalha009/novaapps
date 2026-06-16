# Post-P5 Audit — Store Bridge security suite (2026-06-15)

Gate audit for **Phase P5 — Store Bridge** (ADR-009, I-13). Per `07-quality/audit-mechanism.md §D`. **Verdict: PASS** for the authorable scope; the live OAuth handshake + real Admin calls run on the Mac with the Nova Store Bridge app + a dev store.

## What P5 shipped
`store-bridge` module: OAuth broker (authorize + callback → encrypted offline token + granted scopes), the **scoped/audited/rate-limited GraphQL Admin proxy**, connection connect/list/revoke, and the webhook relay ingress. Env added (`SHOPIFY_BRIDGE_*`, `NOVA_BRIDGE_*`).

## D — Security & access
| Check | Result | Evidence |
|---|---|---|
| **I-13 — only the Bridge touches store tokens / Admin API** | ✅ | grep: only `store-bridge.service` references `accessTokenEnc` (decrypt), `/admin/oauth`, `/admin/api/…/graphql.json`, `X-Shopify-Access-Token`. `stores.service` only **strips** `accessTokenEnc`. No tool/other module calls Shopify. |
| **Tokens never leave the Bridge** | ✅ | proxy returns only the GraphQL result; the token is decrypted in-method, attached to the outbound header, never serialized; all `Store` views omit `accessTokenEnc`. |
| **Tokens encrypted at rest** | ✅ | `accessTokenEnc = encryptSecret(token)` (AES-256-GCM, `APP_ENCRYPTION_KEY`); `grantedScopes` + `tokenRotatedAt` recorded (F9). |
| **Scope enforcement (least privilege)** | ✅ | `assertScopes`: `tool.requiredScopes ⊆ Store.grantedScopes` else 403 — on both `connect` and every `proxyGraphql`. |
| **Entitlement gate (I-12)** | ✅ | `entitlements.resolve(store.agencyId, toolId)` before any store call; 402 if not entitled. |
| **Revoke is immediate + complete** | ✅ | `revoke` → connection `REVOKED`; the next `proxyGraphql` fails at the ACTIVE-connection check (no token issued). |
| **Rate / cost budget** | ✅ (in-process) | per-store budget (`NOVA_BRIDGE_RATE_PER_MIN`, default 120/min) → 429. **Flag P5-2:** in-process Map — use Redis for multi-instance prod. |
| **Tool authentication** | ✅ | proxy + relay require `X-Nova-Signature` (HMAC `NOVA_BRIDGE_SECRET`); OAuth `state` is HMAC-signed (CSRF). |
| **Audit coverage** | ✅ | `authorize`, `connect`, `revoke`, every `graphql` call, write an `AuditLog` row (actor/action/target/outcome). |

## A — Invariant audit (deltas)
- **I-13** ✅ (above). **I-12** ✅ (entitlement gate). **I-14** ◻︎ N/A (per-store billing meter is P6). **I-6** — relayed store events land in the unified ingress (`WebhookEvent source=STORE_BRIDGE`), idempotent on external id.

## Exit gate (`06-plan/phased-plan.md` P5)
- ✅ **Path proven in code:** a tool can read/write a store **only** via the Bridge (connection + scope + entitlement + rate + audit), and **revoke cuts access immediately**.
- ◻︎ **Live:** the real read_products round-trip on a dev store needs `SHOPIFY_BRIDGE_*` + the Nova Store Bridge custom-distribution app (Mac/external) — same status as Encore's Partner app. Carry, not a P5-code blocker.

## Flags
- **P5-1** OAuth handshake + live Admin calls require the Nova Store Bridge app creds + a dev store (Mac).
- **P5-2** rate limiter is in-process — Redis for production/multi-instance.
- **P5-3** webhook relay **records + acks**; the tool-side subscription + routing is wired in the tool repo (Mac).
- **Carry:** P2-1 (Shopify charge payload spike), P1-1 (ESLint boundary), P4 (tool-admin editing + cross-subdomain auth).

## Verdict
**P5 PASS.** STORE/HYBRID tools now have a secure, audited data plane to stores, with least-privilege scopes, entitlement-gated access, immediate revoke, and full audit. Next: **P6 — inbound Stripe billing** (subscriptions + metering + full entitlements: trial/freemium/quota + the per-store meter reading active bridge connections), which completes the Tool money path and activates self-serve subscribe.
