# Design system — type & spacing (Polaris scales · GrowthOS theme)

**Decision (2026-06-11):** Shopify Polaris governs the *scales* (typography ramp, line
heights on a 4px grid, spacing, density). **Theme (C2, 2026-06-11, per Kanwar):** visual
language follows the GrowthOS reference (`Claude/Projects/GrowthOS`, `_shell.css`) in
**white/black monochrome**: cool zinc neutrals on white (#FAFAF9 bg, #E4E4E7 borders,
#18181F text/accent — GrowthOS's indigo accent replaced by black), cards 12px radius with
hairline shadow `0 1px 2px rgba(11,11,20,.03)`, controls 7px radius, black primary buttons,
input focus ring `0 0 0 3px rgba(24,24,31,.10)`, body tracking -0.01em / headings -0.025em,
Inter (cv11 ss01 ss03) + JetBrains Mono numerals.

**Shell:** 248px sidebar (active nav = zinc-100 fill + 2px black left bar) + sticky 56px
topbar (`bg-white/85 backdrop-blur`): breadcrumb identity left; ⌘K search (260px input
look), actions, and circular black avatar menu right. All three dashboard apps identical.

## Headings — element-styled (amended 2026-06-11 per Kanwar)

`h1`–`h3` sizes come from `globals.css` element styles; heading tags carry NO size or
leading utilities (only weight/color/spacing). Exception: uppercase overline headings
keep their explicit `text-xs`/`text-2xs` classes.

| Element | Size/LH | Use |
|---|---|---|
| `h1` | **32/40** | Page titles (PageHeader), detail-page titles, auth titles |
| `h2` | **18/24** | Card headings, section heads above tables |
| `h3` | 16/24 | Sub-headings inside cards/drawers |

## Body ramp (the only text sizes allowed)

| Role | Class | Size/LH | Polaris analog |
|---|---|---|---|
| Hints, overlines, axis labels | `text-2xs` | 11/16 | bodyXs |
| Secondary text, badges, table headers (upper) | `text-xs` | 12/16 | bodySm |
| **Default UI text** — body, tables, inputs, buttons, descriptions | `text-body` | 13/20 | bodyMd |
| Emphasized body, button-row text | `text-sm` | 14/20 | bodyLg |
| Stat values (`num font-semibold`) | `text-xl` | 20 | headingXl |

Rules: NO arbitrary `text-[Npx]` values and no inline `fontSize` styles — every size above
exists as a class. `text-2xs` and `text-body` are defined in each app's `globals.css`
`@theme` block. Numbers always `num`/tabular.

## Spacing (4px grid)

- Card padding: `p-5` (20px) — the single card padding everywhere.
- Page shell: `px-8 pt-8`, content max-widths `max-w-4xl`/`max-w-5xl`.
- Grid/section gaps: `gap-4` (16px); stacked sections `mt-4`/`mt-6`.
- Section headings above tables: `mb-3 mt-6 text-sm font-semibold`.
- Form fields: 16px bottom margin (`.field`), `form-row` 2-col 16px gap.
- Sidebar: 232px, row height h-8, icons 16px/1.5.

## Component font sizes (globals.css)

`.btn` 13px (`.btn-sm` 12, `.btn-lg` 14) · `.input` 13px · `.field-label` 13px ·
`.field-hint` 12px · `.tag` 12px · base body 14px (marketing prose).

## Interactive primitives (added 2026-06-11, shadcn pattern)

Radix + shadcn-style components live at `components/ui/*` in each dashboard app, styled to
Helm tokens (bordered panels, no shadows): `dropdown-menu` (row ⋯ actions, user menu),
`tooltip` (`WithTooltip` wrapper), `command-menu` (⌘K palette via cmdk — pages + entities,
mounted in every dashboard layout), `breadcrumb` (detail pages — no more "← Back" links),
`toaster` (sonner — every demo mutation confirms with `toast.success`). Class merging via
`cn()` (`lib/cn.ts`, clsx + tailwind-merge). Deps: @radix-ui/react-dropdown-menu,
@radix-ui/react-tooltip, cmdk, sonner, clsx, tailwind-merge.

Conventions: primary list CTAs carry a lucide icon (Plus); destructive menu items use
danger tokens; table rows with actions get a trailing ⋯ menu, never inline button rows.

## Change control

These scales are an interface contract for all four apps (C3 to apply, C2 to change the
ramp itself). When adding any new screen or component, pick from the ramp — if a design
needs a size that isn't here, stop and amend this doc first.
