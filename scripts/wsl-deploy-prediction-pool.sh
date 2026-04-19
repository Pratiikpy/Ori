#!/usr/bin/env bash
set -e
export PATH="$HOME/bin:$HOME/.local/bin:$PATH"
export LD_LIBRARY_PATH="$HOME/bin:${LD_LIBRARY_PATH:-}"
cd "/mnt/c/Users/prate/Downloads/Initia builder/ori/packages/contracts"

echo "=== Deploying Move package (will re-publish 16 existing modules + new prediction_pool) ==="
echo "=== Chain: ori-1, Deployer: gas-station, Module addr: 0x05dd0c60873d4d93658d5144fd0615bcfa43a53a"
echo ""

minitiad move deploy \
  --build \
  --language-version=2.1 \
  --named-addresses ori=0x05dd0c60873d4d93658d5144fd0615bcfa43a53a \
  --from gas-station \
  --keyring-backend test \
  --chain-id ori-1 \
  --node http://localhost:26657 \
  --gas auto \
  --gas-adjustment 1.5 \
  --gas-prices 0.15umin \
  --yes 2>&1 | tee /tmp/ori-prediction-pool-deploy.log

echo ""
echo "=== Deploy complete. Extract tx hash:"
grep -E "txhash|code:" /tmp/ori-prediction-pool-deploy.log | head -5
