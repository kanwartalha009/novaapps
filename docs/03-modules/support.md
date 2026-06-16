# Module: support

**Owns:** tickets, ticket chat (bot + human), per-app support routing.
**Depends on:** apps, installations (context), users-rbac. **Consumed by:** admin app (support inbox), agency app (issues view), app backends (ticket intake).
**Added:** C2 2026-06-10.

## Model (built for 100+ apps / 1M+ store users)

- **Everything is app-scoped.** `Ticket.appId` is mandatory and indexed — the inbox, metrics,
  webhook events, and escalations all sort/filter by app first. Support agents work per-app queues.
- **Ticket** — appId, shopDomain, agencyId (attribution via installation), subject, status
  (`OPEN`, `WAITING_ON_MERCHANT`, `RESOLVED`), priority (`LOW`, `NORMAL`, `HIGH`, `URGENT`),
  assigneeUserId?, botHandled (bool), createdAt, lastActivityAt. Indexes: `(appId, status)`,
  `(agencyId)`, `(lastActivityAt)`.
- **TicketMessage** — ticketId, author (`MERCHANT`, `BOT`, `SUPPORT`, `AGENCY`), body, createdAt.

## Intake & bot tier

1. Tickets arrive from app backends (embedded support widget in each generated app —
   engine wiring) via `POST /internal/support/tickets` (HMAC), or from agency dashboards.
2. **Tier 0 — automatic chat:** basic app information (plans, install steps, scopes, billing
   questions) is answered by the bot from the app's registry data (plans, docs, FAQ metafields).
   Bot-resolved threads close without human touch (`botHandled = true`).
   **The bot backend is pluggable (ADR-006): `RULES` (deterministic, default) and `LLM` drivers
   behind one `SupportBotProvider` interface — switchable via `Setting.supportBotProvider`,
   overridable per app. Both produce identical `TicketMessage(BOT)` rows.**
3. **Tier 1 — support team:** bot escalates on intent it can't answer or merchant request.
   Ticket lands in the app's queue with full context (app, store, plan, installation status,
   recent webhook events for that app+shop — same appId key makes this one query).
4. Agencies see (read-only + comment) tickets for stores they referred — surfaced on their
   per-app dashboard as "issues needing attention".

## Permissions (C2 addition to users-rbac)
`support:read`, `support:write` (reply/resolve/assign). SUPPORT role gains both.

## Endpoints
```
GET  /admin/support/tickets?appId=&status=      [support:read]   (paginated, app-first filtering)
GET  /admin/support/tickets/:id                 [support:read]   (incl. messages + app/store context)
POST /admin/support/tickets/:id/messages        [support:write]
POST /admin/support/tickets/:id/resolve         [support:write]
POST /admin/support/tickets/:id/assign          [support:write]
GET  /agencies/me/tickets?appId=                (agency aud — only own attributed stores)
POST /internal/support/tickets                  (HMAC — app backends + bot)
```

## Scale posture (also recorded in architecture.md)
- All list endpoints cursor-paginated from day one; no unbounded queries.
- Hot paths keyed by `appId` (tickets, webhook events, charges) — matches the operational
  reality of 100+ apps: teams work per-app, dashboards aggregate per-app.
- Bot tier absorbs the long tail of 1M+ store users; humans only see escalations.
- Future (C2 when needed): move ticket search to dedicated index; partition webhook_events by month.
