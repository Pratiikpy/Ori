#!/usr/bin/env bash
set -uo pipefail
export PATH="$HOME/bin:$HOME/.local/bin:/usr/local/bin:/usr/bin:/bin"
export LD_LIBRARY_PATH="$HOME/bin:${LD_LIBRARY_PATH:-}"
ORI="0x05dd0c60873d4d93658d5144fd0615bcfa43a53a"

echo "== sub_register dry-run =="
minitiad tx move execute "$ORI" subscription_vault register_plan \
  --args '["u64:50000","u64:60","string:umin"]' \
  --from gas-station --keyring-backend test \
  --chain-id ori-1 --node http://localhost:26657 \
  --gas auto --gas-adjustment 1.5 --gas-prices 0.15umin \
  --output json -y 2>&1 | head -c 1500
echo ""
echo ""
echo "== squad_create dry-run =="
minitiad tx move execute "$ORI" squads create_squad \
  --args "[\"string:Debug Squad $(date +%s)\"]" \
  --from gas-station --keyring-backend test \
  --chain-id ori-1 --node http://localhost:26657 \
  --gas auto --gas-adjustment 1.5 --gas-prices 0.15umin \
  --output json -y 2>&1 | head -c 1500
