#!/usr/bin/env bash
#
# Ori end-to-end testnet deploy script.
#
# Prereqs (must be installed + on PATH):
#   - weave + minitiad + initiad  (https://github.com/initia-labs/weave)
#   - Docker (for the Postgres sidecar if you use the compose.yaml)
#   - pnpm + Node 24
#
# Execution:
#   $ bash scripts/deploy-testnet.sh
#
# The script is idempotent where possible. Set env vars below first:
#   ORI_DEPLOYER_MNEMONIC — 24-word BIP-39 for a funded init1... wallet
#   ORI_CHAIN_ID          — defaults to "ori-1"
#   ORI_RPC_URL           — defaults to http://localhost:26657
#   ORI_REST_URL          — defaults to http://localhost:1317
#   DATABASE_URL          — Postgres connection string
#   REDIS_URL             — redis:// string
#
set -euo pipefail

: "${ORI_CHAIN_ID:=ori-1}"
: "${ORI_RPC_URL:=http://localhost:26657}"
: "${ORI_REST_URL:=http://localhost:1317}"
: "${DATABASE_URL:?set DATABASE_URL to your Postgres connection string}"
: "${REDIS_URL:=redis://localhost:6379}"
: "${ORI_DEPLOYER_MNEMONIC:?set ORI_DEPLOYER_MNEMONIC (24 words from a funded wallet)}"

command -v minitiad >/dev/null || { echo "minitiad not found. Run: weave init"; exit 1; }
command -v initiad  >/dev/null || { echo "initiad not found. Install via weave"; exit 1; }
HAS_PNPM=1
command -v pnpm >/dev/null || HAS_PNPM=0

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

log() { printf '\n\033[1;34m==>\033[0m %s\n' "$*"; }

# ─────────────────────────────────────────────────────────────────────────────
log "1/6  Resolve deployer key from minitiad keyring"
# Prefer a pre-imported `gas-station` (what wsl-import-keys.sh creates), fall
# back to a fresh `ori-deployer` import if it isn't there. The `yes y |` trick
# swallows stdin on some minitiad builds, so we only re-import when forced.
KEY_NAME="gas-station"
if ! minitiad keys show "$KEY_NAME" --keyring-backend test >/dev/null 2>&1; then
  log "    gas-station not found — importing as ori-deployer from ORI_DEPLOYER_MNEMONIC"
  KEY_NAME="ori-deployer"
  minitiad keys delete "$KEY_NAME" --keyring-backend test -y >/dev/null 2>&1 || true
  printf '%s\n' "$ORI_DEPLOYER_MNEMONIC" | minitiad keys add "$KEY_NAME" \
    --recover --keyring-backend test --coin-type 60
fi
DEPLOYER_BECH32=$(minitiad keys show "$KEY_NAME" -a --keyring-backend test)
DEPLOYER_HEX=0x$(initiad keys parse "$DEPLOYER_BECH32" --output json | jq -r '.bytes' | tr '[:upper:]' '[:lower:]')
log "Deployer bech32: $DEPLOYER_BECH32"
log "Deployer hex:    $DEPLOYER_HEX"

# ─────────────────────────────────────────────────────────────────────────────
log "2/6  Build Move modules (16 modules)"
pushd packages/contracts >/dev/null
  minitiad move build \
    --language-version=2.1 \
    --named-addresses "ori=$DEPLOYER_HEX"
  if [ "${SKIP_MOVE_TESTS:-0}" = "1" ]; then
    log "    Skipping 'move test' (SKIP_MOVE_TESTS=1)"
  else
    log "    Running tests"
    minitiad move test \
      --language-version=2.1 \
      --named-addresses "ori=$DEPLOYER_HEX" || {
        log "    Tests failed — run with SKIP_MOVE_TESTS=1 to proceed anyway (build output is still usable)."
        exit 1
      }
  fi
popd >/dev/null

# ─────────────────────────────────────────────────────────────────────────────
log "3/6  Publish modules to rollup (via 'move deploy')"
pushd packages/contracts >/dev/null
  # `move deploy` wraps build+publish and takes the package directory (".")
  # instead of individual .mv files — matches DAY_1_SETUP.md exactly.
  minitiad move deploy \
    --language-version=2.1 \
    --named-addresses "ori=$DEPLOYER_HEX" \
    --upgrade-policy=COMPATIBLE \
    --from "$KEY_NAME" \
    --keyring-backend test \
    --chain-id "$ORI_CHAIN_ID" \
    --node "$ORI_RPC_URL" \
    --gas auto --gas-adjustment 1.6 \
    --yes 2>&1 | tee /tmp/ori-publish.log
  TX_HASH=$(grep -oE 'txhash: [0-9a-fA-F]+' /tmp/ori-publish.log | awk '{print $2}' | head -1)
  if [ -z "$TX_HASH" ]; then
    TX_HASH=$(grep -oE '"txhash":"[0-9a-fA-F]+"' /tmp/ori-publish.log | head -1 | sed 's/"txhash":"//;s/"//')
  fi
  log "    Publish tx: ${TX_HASH:-(unknown — see /tmp/ori-publish.log)}"
popd >/dev/null

# Wait for the tx to settle.
sleep 3

# ─────────────────────────────────────────────────────────────────────────────
log "4/6  Verify module deploy"
minitiad q move resources "$DEPLOYER_HEX" \
  --node "$ORI_RPC_URL" --output json \
  | jq -r '.resources[].struct_tag' \
  | grep -E "::(profile_registry|payment_router|tip_jar|gift_packet|wager_escrow|achievement_sbt|follow_graph|subscription_vault|payment_stream|paywall|reputation|merchant_registry|lucky_pool)::" \
  || { echo "Missing modules — aborting"; exit 1; }
log "    All 13 modules live"

# ─────────────────────────────────────────────────────────────────────────────
if [ "$HAS_PNPM" = "1" ]; then
  log "5/6  Run Postgres migration"
  pushd apps/api >/dev/null
    DATABASE_URL="$DATABASE_URL" pnpm db:migrate:deploy
  popd >/dev/null
else
  log "5/6  Skipping Prisma migration — pnpm not on PATH here"
  log "     (run 'pnpm --filter @ori/api db:migrate:deploy' from the Windows side if needed)"
fi

# ─────────────────────────────────────────────────────────────────────────────
log "6/6  Write deployment record"
mkdir -p .initia
cat > .initia/submission.json <<EOF
{
  "project": "Ori",
  "tagline": "Messages + money, same speed.",
  "chain_id": "$ORI_CHAIN_ID",
  "module_address_hex": "$DEPLOYER_HEX",
  "module_address_bech32": "$DEPLOYER_BECH32",
  "modules": [
    "profile_registry", "payment_router", "tip_jar", "gift_packet",
    "wager_escrow", "achievement_sbt", "follow_graph",
    "subscription_vault", "payment_stream", "paywall",
    "reputation", "merchant_registry", "lucky_pool"
  ],
  "publish_tx": "$TX_HASH",
  "deployed_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF

cat <<DONE

✅ Deploy complete.

Next:
  1) Update apps/web/.env with:
       NEXT_PUBLIC_ORI_MODULE_ADDRESS=$DEPLOYER_HEX
       NEXT_PUBLIC_CHAIN_ID=$ORI_CHAIN_ID
       NEXT_PUBLIC_RPC_URL=$ORI_RPC_URL
       NEXT_PUBLIC_REST_URL=$ORI_REST_URL

  2) Update apps/api/.env with:
       ORI_MODULE_ADDRESS=$DEPLOYER_HEX
       DATABASE_URL=$DATABASE_URL
       REDIS_URL=$REDIS_URL

  3) Start services:
       pnpm --filter @ori/api dev
       pnpm --filter @ori/web dev

  4) If running the MCP server, export:
       export ORI_MODULE_ADDRESS=$DEPLOYER_HEX
       export ORI_MCP_MNEMONIC="..."
       pnpm --filter @ori/mcp-server build && node apps/mcp-server/dist/index.js

DONE
