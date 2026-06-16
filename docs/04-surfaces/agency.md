# App: agency (Next.js · Vercel · :3002 · [slug].<domain>)

Tenant dashboard. Middleware resolves subdomain → rewrites to `/t/[slug]` (ADR-005). JWT must match tenant; API re-verifies (I-9).

## Routes (within tenant)
```
/dashboard            earnings summary, recent activity
/stores               connect/manage Shopify stores
/apps                 catalog of published apps → install on store
/installations        install status per store
/commissions          ledger + balance (pending/approved/paid)
/payouts              history + payout methods
/team                 members (OWNER)
/settings             agency profile (OWNER)
/login                tenant-scoped login
```

Local dev: `acme.nova-apps.localhost:3002`. Reserved slugs rejected at signup.
