# App: admin (Next.js · Vercel · :3001 · admin.<domain>)

RBAC console for platform operators. All data via API with admin-audience JWT cookie; nav/actions hidden by permission but enforcement is server-side (I-10).

## Sections → permissions
```
/dashboard            overview KPIs                      billing:read
/apps                 registry + plans + publish         apps:*
/agencies             approve, rates, members            agencies:*
/stores               connected stores                   stores:read
/installations        install pipeline                   stores:read
/charges              revenue ledger                     billing:read
/commissions          approve/adjust                     commissions:*
/payouts              batches, release, methods          payouts:*
/webhook-events       ingress log + retry                billing:read
/users  /roles        RBAC management                    users:*, roles:*
/settings             commission defaults, maturity      settings:write
```
