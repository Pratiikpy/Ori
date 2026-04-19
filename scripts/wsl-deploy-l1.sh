#!/usr/bin/env bash
#
# Deploy Ori's Move modules to Initia PUBLIC TESTNET L1 (initiation-2).
# Uses `initiad` (not minitiad) because the target is the L1, not a rollup.
#
# Expects:
#   - ori-deployer key already imported to the initiad test keyring
#   - funded with uinit (check: https://scan.testnet.initia.xyz/accounts/<bech32>)
#
set -euo pipefail
export PATH="$HOME/bin:$HOME/go-install/go/bin:$PATH"
export LD_LIBRARY_PATH="$HOME/bin:${LD_LIBRARY_PATH:-}"

KEY=ori-deployer
CHAIN=initiation-2
RPC=https://rpc.testnet.initia.xyz
REST=https://rest.testnet.initia.xyz
GAS_PRICES=0.015uinit

BECH32=$(initiad keys show "$KEY" -a --keyring-backend test)
HEX=0x$(initiad keys parse "$BECH32" --output json | jq -r '.bytes' | tr '[:upper:]' '[:lower:]')
echo "Deployer bech32: $BECH32"
echo "Deployer hex:    $HEX"

echo
echo "=== 1/3 Build Move modules for L1 (ori=$HEX) ==="
cd "/mnt/c/Users/prate/Downloads/Initia builder/ori/packages/contracts"
# We reuse the already-built bytecode if the hex matches; otherwise rebuild.
if ! grep -q "$HEX" build/ori/BuildInfo.yaml 2>/dev/null; then
  minitiad move build --language-version=2.1 --named-addresses "ori=$HEX"
fi

echo
echo "=== 2/3 Publish to $CHAIN ==="
# `initiad tx move publish` wants each .mv file as a separate positional arg.
# We glob the output of the Move build and pass them in a deterministic order.
MV_FILES=(build/ori/bytecode_modules/*.mv)
echo "Publishing ${#MV_FILES[@]} modules:"
printf '  %s\n' "${MV_FILES[@]}"

initiad tx move publish "${MV_FILES[@]}" \
  --upgrade-policy=COMPATIBLE \
  --from "$KEY" \
  --keyring-backend test \
  --chain-id "$CHAIN" \
  --node "$RPC" \
  --gas auto \
  --gas-adjustment 1.6 \
  --gas-prices "$GAS_PRICES" \
  --yes \
  --output json \
  2>&1 | tee /tmp/ori-publish.log

TX_HASH=$(grep -oE '"txhash":"[0-9a-fA-F]{64}"' /tmp/ori-publish.log | head -1 | cut -d'"' -f4)
echo
echo "Publish tx: $TX_HASH"
echo "Explorer:   https://scan.testnet.initia.xyz/tx/$TX_HASH"

echo
echo "=== 3/3 Verify deployed modules ==="
sleep 6
initiad q move resources "$HEX" --node "$RPC" --output json 2>/dev/null \
  | jq -r '.resources[]?.struct_tag' \
  | grep -E "::(profile_registry|payment_router|tip_jar|gift_packet|wager_escrow|achievement_sbt|follow_graph|subscription_vault|payment_stream|paywall|reputation|merchant_registry|lucky_pool|gift_group|gift_box_catalog|squads)::" \
  | sort -u \
  | tee /tmp/ori-modules.txt

MODULE_COUNT=$(wc -l < /tmp/ori-modules.txt)
echo
echo "$MODULE_COUNT Ori resource(s) live at $HEX"

# Write submission record
mkdir -p "/mnt/c/Users/prate/Downloads/Initia builder/ori/.initia"
cat > "/mnt/c/Users/prate/Downloads/Initia builder/ori/.initia/submission.json" <<EOF
{
  "project": "Ori",
  "tagline": "Messages + money, same speed.",
  "chain_id": "$CHAIN",
  "module_address_hex": "$HEX",
  "module_address_bech32": "$BECH32",
  "publish_tx": "$TX_HASH",
  "explorer_tx": "https://scan.testnet.initia.xyz/tx/$TX_HASH",
  "explorer_account": "https://scan.testnet.initia.xyz/accounts/$BECH32",
  "deployed_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
echo
echo "Wrote .initia/submission.json"
