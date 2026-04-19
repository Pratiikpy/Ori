#!/usr/bin/env bash
export PATH="$HOME/bin:$HOME/.local/bin:$PATH"
export LD_LIBRARY_PATH="$HOME/bin:${LD_LIBRARY_PATH:-}"

TX="54C6BB910C39587DC4388AE371F7C972464770CD758F3251548FE06ED9EE72D7"
MODULE="0x05dd0c60873d4d93658d5144fd0615bcfa43a53a"

echo "--- Waiting 8s for tx confirmation..."
sleep 8

echo ""
echo "--- Tx receipt (code + events):"
curl -s "http://localhost:1317/cosmos/tx/v1beta1/txs/$TX" | head -c 2000
echo ""
echo ""
echo "--- Check prediction_pool module exists at 0x05dd0c60...:"
curl -s "http://localhost:1317/initia/move/v1/accounts/$MODULE/modules/prediction_pool" | head -c 800
echo ""
echo ""
echo "--- Total markets (view fn):"
curl -s -X POST "http://localhost:1317/initia/move/v1/view" \
  -H "Content-Type: application/json" \
  -d "{\"address\":\"$MODULE\",\"module_name\":\"prediction_pool\",\"function_name\":\"total_markets\",\"type_args\":[],\"args\":[]}" | head -c 400
echo ""
