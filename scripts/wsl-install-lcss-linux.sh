#!/usr/bin/env bash
set -eu
cd "/mnt/c/Users/prate/Downloads/Initia builder/ori"
DEST="node_modules/.pnpm/lightningcss@1.32.0/node_modules/lightningcss-linux-x64-gnu"
mkdir -p "$DEST"
cp /tmp/lcss/package/lightningcss.linux-x64-gnu.node "$DEST/"
cp /tmp/lcss/package/package.json "$DEST/"
ls -la "$DEST"
# Also install into the top-level node_modules so require('lightningcss-linux-x64-gnu')
# resolves without pnpm indirection.
TOP="node_modules/lightningcss-linux-x64-gnu"
mkdir -p "$TOP"
cp /tmp/lcss/package/lightningcss.linux-x64-gnu.node "$TOP/"
cp /tmp/lcss/package/package.json "$TOP/"
echo "installed at: $TOP"
