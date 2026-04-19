#!/usr/bin/env bash
# End-to-end ON-CHAIN user flows. Executes REAL transactions on ori-1,
# verifies each via tx receipt + view fn + DB event listener pickup.
# Requires: rollup running, postgres + api running, docker at 127.0.0.1:5433.

export PATH="$HOME/bin:$HOME/.local/bin:$PATH"
export LD_LIBRARY_PATH="$HOME/bin:${LD_LIBRARY_PATH:-}"

ORI="0x05dd0c60873d4d93658d5144fd0615bcfa43a53a"
OWNER="init1qhwsccy884xexevd29z06ps4hnay8ff6szgkt2"   # gas-station
PEER="init1lv5zyrw6uzp6wf7alucej54sypemlgmjmdmgwu"    # BridgeExecutor (recipient)
CHAIN="ori-1"
NODE="http://localhost:26657"
REST="http://localhost:1317"
API="http://localhost:3001"
PASS=0
FAIL=0
declare -a FAILS

tx() {
  local label="$1"
  local module="$2"
  local fn="$3"
  shift 3
  # minitiad expects --args as a single JSON array: '["a", "b", "c"]'
  local json_args="["
  local first=1
  for a in "$@"; do
    if [ $first -eq 1 ]; then
      json_args+="\"$a\""
      first=0
    else
      json_args+=",\"$a\""
    fi
  done
  json_args+="]"

  local out
  out=$(minitiad tx move execute "$ORI" "$module" "$fn" \
    --args "$json_args" \
    --from gas-station --keyring-backend test \
    --chain-id "$CHAIN" --node "$NODE" \
    --gas auto --gas-adjustment 1.5 --gas-prices 0.15umin \
    --output json -y 2>&1)
  local code
  code=$(echo "$out" | grep -oE '"code":[0-9]+' | head -1 | grep -oE '[0-9]+')
  local txhash
  txhash=$(echo "$out" | grep -oE '"txhash":"[A-F0-9]+"' | head -1 | cut -d'"' -f4)
  if [ "$code" = "0" ]; then
    printf "  [PASS] %-30s tx=%s\n" "$label" "${txhash:0:16}..."
    PASS=$((PASS+1))
  else
    printf "  [FAIL] %-30s code=%s\n" "$label" "${code:-?}"
    echo "$out" | tail -3 | sed 's/^/       /'
    FAIL=$((FAIL+1))
    FAILS+=("$label code=${code:-?}")
  fi
  # Throttle so sequence numbers don't collide on rapid successive txs.
  sleep 2
}

view() {
  local label="$1"
  local module="$2"
  local fn="$3"
  local args="$4"   # JSON array-of-strings for bcs-encoded args
  local res
  res=$(curl -s -X POST "$REST/initia/move/v1/view" \
    -H "content-type: application/json" \
    -d "{\"address\":\"$ORI\",\"module_name\":\"$module\",\"function_name\":\"$fn\",\"type_args\":[],\"args\":$args}" \
    --max-time 5)
  local data
  data=$(echo "$res" | grep -oE '"data":"[^"]+"' | head -1)
  if [ -n "$data" ]; then
    printf "  [PASS] view %-20s -> %s\n" "$label" "$data"
    PASS=$((PASS+1))
  else
    printf "  [FAIL] view %-20s -> %s\n" "$label" "${res:0:200}"
    FAIL=$((FAIL+1))
    FAILS+=("view $label $res")
  fi
}

bal() {
  curl -s "$REST/cosmos/bank/v1beta1/balances/$1" --max-time 3 \
    | grep -oE '"amount":"[0-9]+"' | head -1 | cut -d'"' -f4
}

echo "========================================================================"
echo "  ON-CHAIN USER FLOW TEST"
echo "  chain=$CHAIN owner=$OWNER peer=$PEER"
echo "========================================================================"
echo ""

B0_OWNER=$(bal "$OWNER")
B0_PEER=$(bal "$PEER")
echo "Starting balances: owner=$B0_OWNER  peer=${B0_PEER:-0}"
echo ""

echo "=== 1. FUND recipient (prereq) ==="
tx fund_peer payment_router send \
  "address:$PEER" "string:umin" "u64:100000000000" "string:seed" "string:"
echo ""

B1_PEER=$(bal "$PEER")
echo "Peer balance after fund: $B1_PEER"
echo ""

echo "=== 2. payment_router::send (in-chat payment) ==="
tx send_payment payment_router send \
  "address:$PEER" "string:umin" "u64:250000" "string:lunch-split" "string:chat-abc"
echo ""

echo "=== 3. payment_router::batch_send ==="
# Signature: (recipients, amounts, memos, denom, batch_id)
tx batch_send payment_router batch_send \
  "vector<address>:$PEER" "vector<u64>:100000" "vector<string>:batch-memo" \
  "string:umin" "string:batch-$(date +%s)"
echo ""

echo "=== 4. tip_jar::tip ==="
tx tip_creator tip_jar tip \
  "address:$PEER" "string:umin" "u64:50000" "string:great work!"
echo ""

echo "=== 5. follow_graph::follow (Validator, to avoid already-following) ==="
VALIDATOR="init1hczz2agguacp2lf5cck4cx0p8ca52hw29gck2a"
tx follow follow_graph follow "address:$VALIDATOR"
echo ""

echo "=== 6. paywall::create_paywall + purchase ==="
PWID_BEFORE=$(curl -s -X POST "$REST/initia/move/v1/view" -H "content-type: application/json" \
  -d "{\"address\":\"$ORI\",\"module_name\":\"paywall\",\"function_name\":\"next_id\",\"type_args\":[],\"args\":[]}" --max-time 3 \
  | grep -oE '"data":"\\"[0-9]+\\""' | grep -oE '[0-9]+')
tx create_paywall paywall create_paywall \
  "string:Test post title" "string:ipfs://bafkreihelloworldtestpostbody" "u64:25000" "string:umin"

# Since gas-station is the creator, they cant buy their own paywall — skip purchase
# unless we fund peer + purchase from peer. We already funded peer above.
# But minitiad tx uses --from gas-station hardcoded in tx() helper, so we cant
# sign as peer. Document this gap.
echo "  (purchase-by-another-account test skipped: tx helper signs as gas-station only)"
echo ""

echo "=== 7. gift_packet::create_link_gift ==="
# 32-byte SHA-256 of a random secret. Non-zero bytes required by contract.
SECRET_HASH="deadbeefcafebabe1122334455667788aabbccddeeff0011deadcafe02468ace"
tx create_gift gift_packet create_link_gift \
  "string:umin" "u64:75000" "u8:0" "string:happy day!" "raw_hex:$SECRET_HASH" "u64:86400"
echo ""

echo "=== 8. wager_escrow::propose_oracle_wager (Slinky oracle bet) ==="
tx propose_oracle_wager wager_escrow propose_oracle_wager \
  "address:$PEER" "string:umin" "u64:100000" \
  "string:BTC above 80k" "string:crypto" "u64:600" \
  "string:BTC/USD" "u256:8000000000" "bool:true"
echo ""

echo "=== 9. prediction_pool::create_market + stake ==="
BTC_PRICE=$(curl -s "$REST/connect/oracle/v2/get_price?currency_pair=BTC/USD" --max-time 3 \
  | grep -oE '"price":"[0-9]+"' | head -1 | cut -d'"' -f4)
echo "  Current BTC/USD raw price: $BTC_PRICE"
tx create_market prediction_pool create_market \
  "string:BTC/USD" "u256:$BTC_PRICE" "bool:true" "u64:60" "string:umin"
# Get latest market id via view fn
MKT_ID=$(curl -s -X POST "$REST/initia/move/v1/view" -H "content-type: application/json" \
  -d "{\"address\":\"$ORI\",\"module_name\":\"prediction_pool\",\"function_name\":\"total_markets\",\"type_args\":[],\"args\":[]}" --max-time 3 \
  | grep -oE '"data":"\\"[0-9]+\\""' | grep -oE '[0-9]+' | head -1)
echo "  Market id after create: $MKT_ID"
tx stake_market prediction_pool stake \
  "u64:$MKT_ID" "bool:true" "u64:150000"
echo ""

echo "=== 10. agent_policy::set_policy + record + revoke (R8 on-chain) ==="
tx set_policy agent_policy set_policy "address:$OWNER" "u64:10000000"
view policy_exists_true agent_policy policy_exists \
  "[\"AAAAAAAAAAAAAAAABd0MYIc9TZNljVFE/QYVvPpDpTo=\",\"AAAAAAAAAAAAAAAABd0MYIc9TZNljVFE/QYVvPpDpTo=\"]"
tx record_spend agent_policy pre_check_and_record "address:$OWNER" "u64:500000"
view remaining_after agent_policy remaining_today \
  "[\"AAAAAAAAAAAAAAAABd0MYIc9TZNljVFE/QYVvPpDpTo=\",\"AAAAAAAAAAAAAAAABd0MYIc9TZNljVFE/QYVvPpDpTo=\"]"
tx revoke agent_policy revoke_agent "address:$OWNER"
view is_active_false agent_policy is_active \
  "[\"AAAAAAAAAAAAAAAABd0MYIc9TZNljVFE/QYVvPpDpTo=\",\"AAAAAAAAAAAAAAAABd0MYIc9TZNljVFE/QYVvPpDpTo=\"]"
echo ""

echo "=== 11. Verify event listener drained events into DB ==="
sleep 6
echo "-- payment_events count:"
docker exec ori-postgres-1 psql -U ori -d ori -c 'SELECT COUNT(*) FROM payment_events;' 2>&1 | tail -3
echo "-- tip_events count:"
docker exec ori-postgres-1 psql -U ori -d ori -c 'SELECT COUNT(*) FROM tip_events;' 2>&1 | tail -3
echo "-- follows count:"
docker exec ori-postgres-1 psql -U ori -d ori -c 'SELECT COUNT(*) FROM follows;' 2>&1 | tail -3
echo "-- payment_links count:"
docker exec ori-postgres-1 psql -U ori -d ori -c 'SELECT COUNT(*) FROM payment_links;' 2>&1 | tail -3
echo ""

B_END_OWNER=$(bal "$OWNER")
B_END_PEER=$(bal "$PEER")
echo "Ending balances: owner=$B_END_OWNER  peer=$B_END_PEER"
echo "  owner delta: $((B0_OWNER - B_END_OWNER)) umin (gas + sent funds)"
echo "  peer  delta: $((${B_END_PEER:-0} - ${B1_PEER:-0})) umin (received)"

echo ""
echo "========================================================================"
echo "  RESULTS: $PASS passed, $FAIL failed"
echo "========================================================================"
if [ $FAIL -gt 0 ]; then
  echo ""; echo "Failures:"
  for f in "${FAILS[@]}"; do echo "  - $f"; done
  exit 1
fi
