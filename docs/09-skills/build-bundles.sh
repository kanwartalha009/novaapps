#!/usr/bin/env bash
# Build installable .skill bundles from the in-repo skill sources.
# Each bundle = a zip of the skill dir (SKILL.md at root + references/).
set -euo pipefail
cd "$(dirname "$0")"
SHARED="_shared"
DIST="dist"
rm -rf "$DIST"; mkdir -p "$DIST"

bundle () {
  local skill="$1"; shift
  local refs="$skill/references"
  mkdir -p "$refs"
  # copy the shared references each skill needs
  for f in "$@"; do cp "$SHARED/$f" "$refs/"; done
  ( cd "$skill" && zip -q -r "../$DIST/$skill.skill" SKILL.md references )
  echo "built $DIST/$skill.skill"
}

bundle nova-validator-app  platform-capability-manifest.md nova-app-spec.schema.md
bundle nova-validator-tool platform-capability-manifest.md nova-tool-spec.schema.md
bundle nova-spec-ingestor  platform-capability-manifest.md nova-app-spec.schema.md nova-tool-spec.schema.md
echo "done -> $DIST/"
