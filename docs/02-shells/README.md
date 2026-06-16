# Shells

A **shell** is a platform surface that *governs or builds*. Distinct from a **product backend** (a standalone repo — see `05-product/`).

| Shell | Runtime | Role | Spec |
|---|---|---|---|
| **Admin Shell** | `apps/admin` (:3001) | Govern the marketplace: agencies, apps, tools, availability, licensing, payouts, settings | `admin-shell.md` |
| **App Shell** | `apps/app-admin` (:3003) | Build/manage **one App**: blueprint, build-pack, engine, publish | `app-shell.md` |
| **Tool Shell** | `apps/tool-admin` (:3004) | Build/manage **one Tool**: blueprint, backend, Store Bridge, plans, release | `tool-shell.md` |
| **Agency surface** | `apps/agency` (:3002) | Consume the marketplace: stores, app installs (earn), tool activations (pay/comped) | `agency-surface.md` |

Frontend route maps for each live in `04-surfaces/`; backend behavior lives in `03-modules/`. These specs describe each shell's **responsibilities, sections, and the modules/permissions behind them**.

## How a product is born (both classes)
```
Admin Shell: register product (class fixed here) ──► builder Shell (App or Tool): blueprint + engine create
   ──► product is a standalone repo (own DB) ──► Admin Shell: set Availability + licensing
   ──► Agency surface: install (App) or activate (Tool)
```
