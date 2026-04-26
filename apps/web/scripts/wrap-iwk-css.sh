#!/usr/bin/env bash
# Regenerate apps/web/src/app/iwk-vendor.css by wrapping
# @initia/interwovenkit-react/dist/styles.css in `@layer interwovenkit { }`.
#
# WHY: the vendor CSS ships unlayered :where(*) resets that beat Tailwind
# utilities per CSS spec. Wrapping it in a low-priority layer fixes that.
# See apps/web/src/app/globals.css for the layer-order rationale.
#
# We commit the generated file so Vercel doesn't need to run any prebuild
# script. Re-run this whenever the @initia/interwovenkit-react package
# updates and you want to pick up new drawer styles.
#
# Run from repo root:  bash apps/web/scripts/wrap-iwk-css.sh

set -euo pipefail

VENDOR="apps/web/node_modules/@initia/interwovenkit-react/dist/styles.css"
OUT="apps/web/src/app/iwk-vendor.css"

if [ ! -f "$VENDOR" ]; then
  echo "vendor file not found: $VENDOR" >&2
  echo "run \`pnpm install\` first" >&2
  exit 1
fi

{
  echo "/* Auto-generated wrapper. Regenerate with: bash apps/web/scripts/wrap-iwk-css.sh"
  echo " * Source: @initia/interwovenkit-react/dist/styles.css (vendor file)"
  echo " * The vendor CSS is wrapped in @layer interwovenkit so its unlayered"
  echo " * :where(*) reset doesn't beat our Tailwind utilities. See globals.css"
  echo " * for the cascade-order rationale."
  echo " */"
  echo "@layer interwovenkit {"
  cat "$VENDOR"
  echo ""
  echo "}"
} > "$OUT"

echo "wrote $(wc -c < "$OUT") bytes to $OUT"
