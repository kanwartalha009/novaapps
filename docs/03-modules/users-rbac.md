# Module: users + rbac

**Owns:** User CRUD, Role/Permission model, permission checks (admin surface).
**Depends on:** (none below auth). **Consumed by:** auth, agencies, admin app.

## Permissions (seeded constants, `packages/shared/src/permissions.ts`)
```
users:read users:write
roles:read roles:write
apps:read apps:write apps:publish
agencies:read agencies:write
stores:read
billing:read
commissions:read commissions:approve
payouts:read payouts:create payouts:release
settings:write
```
Adding a permission string = C2 change (shared package + seed + guard usage).

## Behavior
- Roles are admin-configurable sets of permissions. `SUPER_ADMIN` role seeded, undeletable.
- Agency-side roles are NOT here — agency membership roles (`OWNER`/`MEMBER`) live on `AgencyMember` (agencies module).

## Endpoints (admin audience)
```
GET/POST/PATCH /admin/users         [users:*]
GET/POST/PATCH /admin/roles         [roles:*]
GET            /admin/permissions   [roles:read]
```
