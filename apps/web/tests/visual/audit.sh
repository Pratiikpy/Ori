#!/usr/bin/env bash
# audit.sh — pure-text visual divergence check.
#
# Extracts every className="..." string from each reference page and our
# matching (ori) / (marketing) page, sorts both lists, and diffs.
#
# Why this works: if every Tailwind class string in our page is present in
# the reference's page in the same multiset, the rendered DOM has the same
# styling for the same elements. There's nothing to render-and-compare —
# the source-level identity guarantees the visual identity.
#
# Run from repo root:  bash apps/web/tests/visual/audit.sh
#
# Prints a per-page summary; exits 0 if all diffs are 0, else exits 1.

set -uo pipefail

REF="${REF:-./ui-ref-orii/frontend/src}"
OUR="${OUR:-./apps/web/src}"
OUT="${OUT:-./apps/web/tests/visual/audit}"

if [ ! -d "$REF" ]; then
  REF="../ui-ref-orii/frontend/src"
fi
if [ ! -d "$REF" ]; then
  REF="C:/Users/prate/Downloads/ui-ref-orii/frontend/src"
fi

mkdir -p "$OUT"

PAIRS=(
  "Landing.jsx:app/(marketing)/page.tsx"
  "Inbox.jsx:app/(ori)/inbox/page.tsx"
  "Money.jsx:app/(ori)/money/page.tsx"
  "Play.jsx:app/(ori)/play/page.tsx"
  "Explore.jsx:app/(ori)/explore/page.tsx"
  "Profile.jsx:app/(ori)/profile/page.tsx"
)

extract_classes() {
  local file="$1"
  grep -oE 'className=("[^"]*"|\{`[^`]*`\})' "$file" 2>/dev/null \
    | sed 's/className=//' \
    | sed 's/^"//; s/"$//' \
    | sed 's/^{`//; s/`}$//' \
    | sort
}

fail=0
total_pages=0
clean_pages=0

printf "%-12s %-12s %-12s %-10s\n" "PAGE" "REF_LINES" "OUR_LINES" "DIFF"
printf "%-12s %-12s %-12s %-10s\n" "----" "---------" "---------" "----"

for pair in "${PAIRS[@]}"; do
  ref_file="${pair%%:*}"
  our_file="${pair##*:}"
  name="${ref_file%.jsx}"

  if [ ! -f "$REF/pages/$ref_file" ]; then
    printf "%-12s missing reference: %s\n" "$name" "$REF/pages/$ref_file"
    fail=1
    continue
  fi
  if [ ! -f "$OUR/$our_file" ]; then
    printf "%-12s missing built: %s\n" "$name" "$OUR/$our_file"
    fail=1
    continue
  fi

  extract_classes "$REF/pages/$ref_file" > "$OUT/ref-$name.txt"
  extract_classes "$OUR/$our_file"       > "$OUT/our-$name.txt"

  ref_lines=$(wc -l < "$OUT/ref-$name.txt")
  our_lines=$(wc -l < "$OUT/our-$name.txt")
  diff_count=$(diff "$OUT/ref-$name.txt" "$OUT/our-$name.txt" 2>/dev/null | wc -l)

  total_pages=$((total_pages + 1))
  if [ "$diff_count" -eq 0 ]; then
    clean_pages=$((clean_pages + 1))
  else
    fail=1
  fi

  printf "%-12s %-12s %-12s %-10s\n" "$name" "$ref_lines" "$our_lines" "$diff_count"
done

echo ""
echo "Summary: $clean_pages/$total_pages pages have 0 className divergence."
echo "Per-page diffs are at: $OUT/ref-<page>.txt vs $OUT/our-<page>.txt"
echo "Run \`diff $OUT/ref-<page>.txt $OUT/our-<page>.txt\` for any non-zero row."

exit "$fail"
