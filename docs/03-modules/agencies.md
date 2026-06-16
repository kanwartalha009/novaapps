# Module: agencies

**Owns:** Agency tenant lifecycle, membership, agency settings, commission rate config.
**Depends on:** users. **Consumed by:** stores, installations, commissions, payouts.

## Behavior
- Signup (web app → API): creates Agency (status `PENDING_APPROVAL`) + owner User + AgencyMember(OWNER). Admin approves → `ACTIVE`.
- **Admin-created agencies (C2, 2026-06-10):** `POST /admin/agencies` creates an Agency directly with status `ACTIVE` (pre-approved) + owner invite email (owner sets password via invite link, Phase 2 mailer).
- **App assignments (C2, 2026-06-10):** `AgencyApp` join — an agency may distribute only apps assigned to it. Assignment carries optional `rateBps` override. **Rate resolution: `AgencyApp.rateBps ?? Agency.commissionRateBps ?? Setting.defaultCommissionRateBps`** (consumed by commissions module; snapshotted per commission as before, I-5). Catalog and install endpoints filter by assignment. Availability is also manageable app-side (app detail → Agencies). **Redaction gate (C2):** an assignment may be removed (redacted) for an agency only while that agency has **no ACTIVE installations** of the app; revoking from all agencies requires zero active installs anywhere — existing merchants are never cut off.
- `slug` unique, validated (dns-safe, reserved list from ADR-005), **immutable after approval** (C3 to change).
- Commission rate: platform default (`Setting.defaultCommissionRateBps`) overridable per agency (`Agency.commissionRateBps`). Rate is snapshotted onto each Commission at calculation time — later rate changes never rewrite history (I-5).
- Members: owner invites by email; member accepts → User + AgencyMember(MEMBER).

## Endpoints
```
POST  /agencies/signup                       (public)
GET   /agencies/me                           (agency aud; resolves from JWT agencyId)
PATCH /agencies/me                           (OWNER)
GET/POST/DELETE /agencies/me/members         (OWNER)
GET/POST/PATCH /admin/agencies               [agencies:*]   (POST = admin-create + owner invite)
POST  /admin/agencies/:id/approve            [agencies:write]
GET/POST/DELETE /admin/agencies/:id/apps     [agencies:write]  (assignments + rate overrides; DELETE gated: no active installs)
GET/POST/DELETE /admin/apps/:id/agencies     [apps:write]      (app-side availability; same redaction gate)
```
