#!/usr/bin/env bash
#
# Glue between `weave init` and `scripts/deploy-testnet.sh`.
#
# After `weave init` succeeds, this script:
#   1. starts the opinit-bots executor + relayer as background daemons
#      (if not already running)
#   2. imports the gas-station mnemonic from ~/.weave/config.json into
#      minitiad + initiad keyrings (idempotent)
#   3. exports ORI_DEPLOYER_MNEMONIC into the current shell and invokes
#      deploy-testnet.sh
#
# Usage (in WSL, repo root):
#   source scripts/wsl-post-weave.sh
#
# `source` matters: we want ORI_DEPLOYER_MNEMONIC in your shell for later
# convenience. If you just `bash` this, the env disappears on exit.
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")/.." && pwd)"

log() { printf '\n\033[1;34m==>\033[0m %s\n' "$*"; }
warn() { printf '\n\033[1;33m!! \033[0m %s\n' "$*"; }

# --- sanity checks ---------------------------------------------------------
command -v weave    >/dev/null || { warn "weave not on PATH — run wsl-install-initia.sh first"; exit 1; }
command -v minitiad >/dev/null || { warn "minitiad not on PATH — run wsl-install-minitia.sh first"; exit 1; }
command -v initiad  >/dev/null || { warn "initiad not on PATH — run wsl-install-minitia.sh first"; exit 1; }
command -v jq       >/dev/null || { warn "jq required — apt install -y jq"; exit 1; }

WEAVE_CONF="$HOME/.weave/config.json"
[ -f "$WEAVE_CONF" ] || { warn "$WEAVE_CONF not found — did 'weave init' complete?"; exit 1; }

# --- 1) start daemons if not running ---------------------------------------
# opinit-bots: executor = the L2 validator that advances blocks on the L1
# settlement chain. relayer: moves IBC packets between L1 and the rollup.
# Both are idempotent; if already running `weave … start -d` is a no-op.
log "1/3  Ensuring opinit executor + relayer daemons are up"
if ! pgrep -f "opinitd.*executor" >/dev/null; then
  weave opinit start executor -d || warn "opinit executor failed to start — check 'weave opinit logs executor'"
else
  log "   opinit executor already running"
fi
# The relayer runs as a Docker container named "weave-relayer", not a native
# process — so pgrep won't find it. Check container state instead: start it
# if stopped, create it via weave only if the container doesn't exist yet.
if docker ps --filter "name=weave-relayer" --format '{{.Names}}' | grep -q weave-relayer; then
  log "   relayer container already running"
elif docker ps -a --filter "name=weave-relayer" --format '{{.Names}}' | grep -q weave-relayer; then
  log "   relayer container exists but stopped — starting"
  docker start weave-relayer >/dev/null || warn "docker start weave-relayer failed"
else
  weave relayer start -d || warn "relayer failed to start — check 'weave relayer logs'"
fi

# Give the node a beat to settle before we issue tx queries.
sleep 3

# --- 2) import gas-station into keyrings -----------------------------------
log "2/3  Importing gas-station key into minitiad + initiad"
MNEMONIC=$(jq -r '.common.gas_station.mnemonic' "$WEAVE_CONF")
if [ -z "$MNEMONIC" ] || [ "$MNEMONIC" = "null" ]; then
  warn "gas-station mnemonic missing from $WEAVE_CONF — re-run weave init"
  exit 1
fi

# The `keys add --recover` prompt reads the mnemonic from stdin. The `yes y`
# pipe auto-confirms the "overwrite existing key?" prompt if the key exists.
for bin in minitiad initiad; do
  if "$bin" keys show gas-station --keyring-backend test >/dev/null 2>&1; then
    log "   $bin keyring already has gas-station"
  else
    echo "$MNEMONIC" | (yes y | "$bin" keys add gas-station \
        --recover --keyring-backend test \
        --coin-type 60 --key-type eth_secp256k1 >/dev/null 2>&1) || true
    log "   $bin gas-station imported"
  fi
done

DEPLOYER_BECH32=$(minitiad keys show gas-station -a --keyring-backend test)
DEPLOYER_HEX=0x$(initiad keys parse "$DEPLOYER_BECH32" --output json | jq -r '.bytes' | tr '[:upper:]' '[:lower:]')
log "   bech32: $DEPLOYER_BECH32"
log "   hex:    $DEPLOYER_HEX"

# --- 3) export + hand off to deploy-testnet.sh -----------------------------
export ORI_DEPLOYER_MNEMONIC="$MNEMONIC"
export ORI_CHAIN_ID="${ORI_CHAIN_ID:-ori-1}"
export ORI_RPC_URL="${ORI_RPC_URL:-http://localhost:26657}"
export ORI_REST_URL="${ORI_REST_URL:-http://localhost:1317}"
export DATABASE_URL="${DATABASE_URL:-postgresql://ori:ori@localhost:5432/ori}"
export REDIS_URL="${REDIS_URL:-redis://localhost:6379}"

log "3/3  Handing off to deploy-testnet.sh"
bash "$ROOT/scripts/deploy-testnet.sh"

log "Done. DEPLOYER_HEX=$DEPLOYER_HEX — paste this into apps/web/.env and apps/api/.env."
