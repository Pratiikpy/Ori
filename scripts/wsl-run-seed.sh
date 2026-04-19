#!/usr/bin/env bash
# Seed the freshly-deployed ori-1 rollup with demo data.
# Uses the same deployer mnemonic that deploy-testnet.sh used.
set -euo pipefail

export PATH="$HOME/bin:$HOME/go-install/go/bin:/usr/local/bin:/usr/bin:/bin"
export LD_LIBRARY_PATH="$HOME/bin"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

WEAVE_CONF="$HOME/.weave/config.json"
test -f "$WEAVE_CONF" || { echo "$WEAVE_CONF missing — run weave init first"; exit 1; }

# Pull all seed-time env from the same sources that deployed the rollup.
# This keeps the chain-id / module-address / mnemonic coherent across scripts.
export ORI_CHAIN_ID="ori-1"
export ORI_REST_URL="http://localhost:1317"
export ORI_DENOM="umin"
export ORI_MODULE_ADDRESS="0x05dd0c60873d4d93658d5144fd0615bcfa43a53a"
export ORI_DEPLOYER_MNEMONIC="$(jq -r '.common.gas_station.mnemonic' "$WEAVE_CONF")"

# Node on WSL Ubuntu via nvm — if not installed, we need to fall back to the
# Windows-side `pnpm` which is what actually runs our apps. Detect and adapt.
if command -v pnpm >/dev/null 2>&1; then
  echo "[seed] running via pnpm in WSL"
  pnpm --filter @ori/api exec tsx apps/api/scripts/seed-demo-data.ts
else
  echo "[seed] pnpm not on WSL PATH — invoking Windows-side pnpm via /mnt/c"
  # Rely on the Node+pnpm already installed on the Windows host. We must cd
  # from /mnt/c path so the script sees the monorepo.
  PNPM_WIN="$(command -v pnpm.cmd 2>/dev/null || echo '/mnt/c/Program Files/nodejs/pnpm.cmd')"
  test -x "$PNPM_WIN" || { echo "pnpm not found on Windows side either"; exit 1; }
  "$PNPM_WIN" --filter @ori/api exec tsx apps/api/scripts/seed-demo-data.ts
fi
