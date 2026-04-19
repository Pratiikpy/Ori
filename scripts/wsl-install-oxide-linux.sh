#!/usr/bin/env bash
set -eu
cd "/mnt/c/Users/prate/Downloads/Initia builder/ori"
# Place in both (a) the pnpm-hoisted location and (b) the top-level
# node_modules so `require('@tailwindcss/oxide-linux-x64-gnu')` resolves no
# matter which path the CJS resolver starts from.
SCOPED="node_modules/@tailwindcss/oxide-linux-x64-gnu"
PNPM="node_modules/.pnpm/@tailwindcss+oxide@4.2.2/node_modules/@tailwindcss/oxide-linux-x64-gnu"
for D in "$SCOPED" "$PNPM"; do
  mkdir -p "$D"
  cp /tmp/oxide/package/tailwindcss-oxide.linux-x64-gnu.node "$D/"
  cp /tmp/oxide/package/package.json "$D/"
done
ls -la "$SCOPED"
echo "installed"
