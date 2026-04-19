#!/usr/bin/env bash
set -u
OUT="/mnt/c/Users/prate/Downloads/Initia builder"
mkdir -p /tmp/gd
cd /tmp/gd
for b in linear.app raycast claude vercel voltagent warp cursor stripe cal x.ai notion; do
  rm -f DESIGN.md
  timeout 50 npx --yes getdesign@latest add "$b" </dev/null >/dev/null 2>&1
  if [ -f DESIGN.md ]; then
    cp DESIGN.md "$OUT/tmp-$b.md"
    echo "ok    $b  ($(wc -l < DESIGN.md) lines)"
  else
    echo "FAIL  $b"
  fi
done
echo "---"
ls "$OUT/" | grep "^tmp-"
