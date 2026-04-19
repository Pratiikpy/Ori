#!/usr/bin/env bash
set -euo pipefail
export PATH="$HOME/bin:$PATH"
export LD_LIBRARY_PATH="$HOME/bin:${LD_LIBRARY_PATH:-}"
ADDR="${1:-init1rl39lds33csewwwc6d7fv3z868hsh6auu9h5vy}"
HEX=0x$(initiad keys parse "$ADDR" --output json | jq -r '.bytes' | tr '[:upper:]' '[:lower:]')
echo "Bech32: $ADDR"
echo "Hex:    $HEX"
