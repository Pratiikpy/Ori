#!/usr/bin/env bash
set -euo pipefail
export PATH="$HOME/bin:$HOME/go-install/go/bin:$PATH"
export LD_LIBRARY_PATH="$HOME/bin:${LD_LIBRARY_PATH:-}"
ADDR="${1:-0x1234567890abcdef1234567890abcdef12345678}"
cd "/mnt/c/Users/prate/Downloads/Initia builder/ori/packages/contracts"
echo "=== minitiad move test (ori=$ADDR) ==="
minitiad move test --language-version=2.1 --named-addresses "ori=$ADDR"
