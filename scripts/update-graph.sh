#!/usr/bin/env bash
# Rebuild the knowledge graph and keep it at docs/architecture-graph/.
#
# graphify's CLI writes to ./graphify-out/ by default with no --output flag
# as of v0.4.20. We sync the output to docs/architecture-graph/ so the
# committed location stays stable and navigable from the repo root.
#
# Usage (from anywhere in the repo):
#   bash scripts/update-graph.sh
#
# AST-only, no LLM cost. Safe to run in CI / pre-commit hooks.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

GRAPHIFY="${GRAPHIFY:-$HOME/.local/bin/graphify}"
test -x "$GRAPHIFY" || { echo "graphify not found at $GRAPHIFY"; exit 1; }

"$GRAPHIFY" update .

DEST="docs/architecture-graph"
SRC="graphify-out"
test -d "$SRC" || { echo "no $SRC produced — check graphify output above"; exit 1; }

mkdir -p "$DEST"
# Replace rather than merge — a stale cache/ from a previous run shouldn't
# stick around once the new build has overwritten graph.json.
rm -rf "$DEST"/*
mv "$SRC"/* "$DEST"/
rmdir "$SRC"

echo
echo "Graph synced to $DEST/"
ls -lh "$DEST/"
