#!/usr/bin/env bash
set -e
export PATH="$HOME/bin:$HOME/.local/bin:$PATH"
export LD_LIBRARY_PATH="$HOME/bin:${LD_LIBRARY_PATH:-}"
cd "/mnt/c/Users/prate/Downloads/Initia builder/ori/packages/contracts"

echo "=== Deploying full Move package (new module: agent_policy) ==="

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
  --yes 2>&1 | tee /tmp/ori-agent-policy-deploy.log

echo ""
echo "=== Deploy result ==="
grep -E "txhash|code:" /tmp/ori-agent-policy-deploy.log | head -5
