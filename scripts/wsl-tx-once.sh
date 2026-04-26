#!/usr/bin/env bash
# Single payment_router::send tx for end-to-end pipeline proof.
# Captures tx hash + block height for downstream verification.
set -uo pipefail
export PATH="$HOME/bin:$HOME/.local/bin:/usr/local/bin:/usr/bin:/bin"
export LD_LIBRARY_PATH="$HOME/bin:${LD_LIBRARY_PATH:-}"

ORI="0x05dd0c60873d4d93658d5144fd0615bcfa43a53a"
PEER="init1lv5zyrw6uzp6wf7alucej54sypemlgmjmdmgwu"
CHAIN="ori-1"
NODE="http://localhost:26657"

echo "== chain status =="
minitiad status --node "$NODE" 2>&1 | tr ',' '\n' | grep -E 'latest_block_height|catching_up|moniker' | head -5

echo ""
echo "== keyring =="
minitiad keys list --keyring-backend test 2>&1 | head -20

echo ""
echo "== sending payment_router::send =="
MEMO="e2e-proof-$(date +%s)"
OUT=$(minitiad tx move execute "$ORI" payment_router send \
  --args "[\"address:$PEER\",\"string:umin\",\"u64:777000\",\"string:$MEMO\",\"string:e2e-thread\"]" \
  --from gas-station --keyring-backend test \
  --chain-id "$CHAIN" --node "$NODE" \
  --gas auto --gas-adjustment 1.5 --gas-prices 0.15umin \
  --output json -y 2>&1)
echo "$OUT" | tail -1

TXHASH=$(echo "$OUT" | tail -1 | grep -oE '"txhash":"[A-F0-9]+"' | head -1 | cut -d'"' -f4)
echo "TXHASH=$TXHASH"

# wait for inclusion
sleep 4
echo ""
echo "== tx receipt =="
RES=$(minitiad q tx "$TXHASH" --node "$NODE" --output json 2>&1)
echo "$RES" | tr ',' '\n' | grep -E '"code"|"height"|"raw_log"' | head -10
