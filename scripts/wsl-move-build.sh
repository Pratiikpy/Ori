#!/usr/bin/env bash
# Build Move modules inside WSL. Expects scripts/wsl-install-initia.sh +
# scripts/wsl-install-minitia.sh to have run.
set -euo pipefail

export PATH="$HOME/bin:$HOME/go-install/go/bin:$PATH"
export LD_LIBRARY_PATH="$HOME/bin:${LD_LIBRARY_PATH:-}"

# Default: a placeholder deployer address so we can catch compile errors
# without a funded wallet. Override with --addr 0x… when deploying for real.
ADDR="${1:-0x1234567890abcdef1234567890abcdef12345678}"

cd "/mnt/c/Users/prate/Downloads/Initia builder/ori/packages/contracts"

echo "=== minitiad move build (ori=$ADDR) ==="
minitiad move build --language-version=2.1 --named-addresses "ori=$ADDR"
