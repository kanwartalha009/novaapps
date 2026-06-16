# Creation skills

Three installable skills that formalize **Stage 1** of the runbook (idea → spec → config + plan). They chain:

```
idea ──► nova-validator-app  ┐
         nova-validator-tool ┘──► Nova App/Tool Spec ──► nova-spec-ingestor ──► seeders + phased build docs
```

| Skill | Does | In | Out |
|---|---|---|---|
| `nova-validator-app` | validate an **App** idea (idea + platform-fit + pricing + risk) | idea / rough spec | `*-app-spec.md` |
| `nova-validator-tool` | validate a **Tool** idea (type + Store Bridge + Stripe pricing + entitlements + risk) | idea / rough spec | `*-tool-spec.md` |
| `nova-spec-ingestor` | seed the registry + scaffold the build plan | a validated spec | `seed.<slug>.ts` + build-pack/delivery-plan/prerequisites |

All three read the **Platform Capability Manifest** (`_shared/platform-capability-manifest.md`) so "does this work on Nova?" is checkable. The spec schemas (`_shared/nova-*-spec.schema.md`) are the contract between validators and the ingestor — same shape the registry stores.

## Layout
```
09-skills/
  _shared/        canonical manifest + spec schemas (source of truth; bump version on change)
  nova-validator-app/   SKILL.md (+ references/ copied from _shared at bundle time)
  nova-validator-tool/  SKILL.md (+ references/)
  nova-spec-ingestor/   SKILL.md + references/templates.md (+ schemas/manifest)
```

## Install
Each is delivered as an installable `.skill` bundle (zip of the skill dir incl. `references/`). Save via the install button, then invoke by name in any chat (e.g. "validate this tool idea with nova-validator-tool"). The in-repo source here is the version-controlled master — edit here, re-bundle, re-install. You said you'll keep improving these; treat `_shared/` as the thing to evolve first (the skills inherit it).

## Build the bundles
```
docs/09-skills/build-bundles.sh   # copies _shared refs into each skill, zips to *.skill
```
