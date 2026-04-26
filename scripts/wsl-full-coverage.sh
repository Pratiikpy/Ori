#!/usr/bin/env bash
# Full coverage on-chain flow battery. Exercises every Move entrypoint that
# emits a user-visible event. Intended to be run once; downstream verification
# via the cron sync + API + Playwright lives outside this script.
#
# Two signers:
#   gas-station = init1qhwsccy884xexevd29z06ps4hnay8ff6szgkt2  (owner)
#   alice-test  = init1m57yx20zrq27r0zk28utrkctp9kdkp7s337sm4  (peer)
set -uo pipefail
export PATH="$HOME/bin:$HOME/.local/bin:/usr/local/bin:/usr/bin:/bin"
export LD_LIBRARY_PATH="$HOME/bin:${LD_LIBRARY_PATH:-}"

ORI="0x05dd0c60873d4d93658d5144fd0615bcfa43a53a"
OWNER="init1qhwsccy884xexevd29z06ps4hnay8ff6szgkt2"
ALICE="init1m57yx20zrq27r0zk28utrkctp9kdkp7s337sm4"
PEER="init1lv5zyrw6uzp6wf7alucej54sypemlgmjmdmgwu"
VALIDATOR="init1hczz2agguacp2lf5cck4cx0p8ca52hw29gck2a"
CHAIN="ori-1"
NODE="http://localhost:26657"
REST="http://localhost:1317"
LOG="/tmp/ori-coverage.log"
: > "$LOG"

PASS=0
FAIL=0
declare -a FAILS

# Run a Move tx as a given keyring key. Echoes "label = txhash height code".
tx_as() {
  local key="$1" label="$2" module="$3" fn="$4"
  shift 4
  local json_args="["
  local first=1
  for a in "$@"; do
    if [ $first -eq 1 ]; then json_args+="\"$a\""; first=0
    else json_args+=",\"$a\""; fi
  done
  json_args+="]"
  local out
  out=$(minitiad tx move execute "$ORI" "$module" "$fn" \
    --args "$json_args" \
    --from "$key" --keyring-backend test \
    --chain-id "$CHAIN" --node "$NODE" \
    --gas auto --gas-adjustment 1.5 --gas-prices 0.15umin \
    --output json -y 2>&1)
  local code txhash height
  code=$(echo "$out" | tail -1 | grep -oE '"code":[0-9]+' | head -1 | grep -oE '[0-9]+')
  txhash=$(echo "$out" | tail -1 | grep -oE '"txhash":"[A-F0-9]+"' | head -1 | cut -d'"' -f4)
  if [ "${code:-1}" = "0" ]; then
    sleep 3
    local rec
    rec=$(minitiad q tx "$txhash" --node "$NODE" --output json 2>&1)
    height=$(echo "$rec" | grep -oE '"height":"[0-9]+"' | head -1 | cut -d'"' -f4)
    local rcode
    rcode=$(echo "$rec" | grep -oE '"code":[0-9]+' | head -1 | grep -oE '[0-9]+')
    if [ "${rcode:-1}" = "0" ]; then
      printf "  [PASS] %-32s tx=%s height=%s\n" "$label" "${txhash:0:12}..." "$height" | tee -a "$LOG"
      PASS=$((PASS+1))
      echo "$txhash"
    else
      local raw_log
      raw_log=$(echo "$rec" | grep -oE '"raw_log":"[^"]*"' | head -1 | cut -c12- | head -c 200)
      printf "  [FAIL] %-32s rcode=%s log=%s\n" "$label" "$rcode" "$raw_log" | tee -a "$LOG"
      FAIL=$((FAIL+1))
      FAILS+=("$label rcode=$rcode")
      echo ""
    fi
  else
    local raw_log
    raw_log=$(echo "$out" | tail -1 | grep -oE '"raw_log":"[^"]*"' | head -1 | head -c 200)
    printf "  [FAIL] %-32s code=%s log=%s\n" "$label" "${code:-?}" "$raw_log" | tee -a "$LOG"
    FAIL=$((FAIL+1))
    FAILS+=("$label code=${code:-?}")
    echo ""
  fi
  sleep 2
}

# View fn returning an integer scalar (e.g. next_id, total_markets).
view_int() {
  local module="$1" fn="$2" args="$3"
  curl -s -X POST "$REST/initia/move/v1/view" \
    -H "content-type: application/json" \
    -d "{\"address\":\"$ORI\",\"module_name\":\"$module\",\"function_name\":\"$fn\",\"type_args\":[],\"args\":$args}" \
    --max-time 5 \
    | grep -oE '"data":"\\"[0-9]+\\""' | grep -oE '[0-9]+' | head -1
}

bal() {
  curl -s "$REST/cosmos/bank/v1beta1/balances/$1" --max-time 3 \
    | grep -oE '"amount":"[0-9]+"' | head -1 | cut -d'"' -f4
}

echo "============================================================"
echo "FULL COVERAGE FLOW BATTERY"
echo "owner=$OWNER"
echo "alice=$ALICE"
echo "============================================================"
echo "Initial balances: owner=$(bal $OWNER) alice=$(bal $ALICE) peer=$(bal $PEER)"
echo ""

echo "=== Prefund alice (so she can sign txs and pay gas) ==="
tx_as gas-station prefund_alice payment_router send \
  "address:$ALICE" string:umin u64:5000000000 string:prefund-alice string:funding > /dev/null
echo "  alice balance after prefund: $(bal $ALICE)"
echo ""

echo "=== 1. payment_router::send (one-shot direct payment) ==="
tx_as gas-station payment_send payment_router send \
  "address:$PEER" string:umin u64:111000 "string:cov-pay-$(date +%s)" string:cov-thread > /dev/null

echo "=== 2. payment_router::batch_send ==="
tx_as gas-station payment_batch_send payment_router batch_send \
  "vector<address>:$PEER" "vector<u64>:222000" "vector<string>:cov-batch" \
  string:umin "string:batch-$(date +%s)" > /dev/null

echo "=== 3. tip_jar::tip ==="
tx_as gas-station tip tip_jar tip \
  "address:$PEER" string:umin u64:33000 "string:tip-from-cov" > /dev/null

echo "=== 4. follow_graph::follow ==="
tx_as gas-station follow follow_graph follow "address:$VALIDATOR" > /dev/null

echo "=== 5. follow_graph::unfollow ==="
tx_as gas-station unfollow follow_graph unfollow "address:$VALIDATOR" > /dev/null

echo "=== 6. profile_registry::update_bio ==="
tx_as gas-station update_bio profile_registry update_bio "string:full-coverage-bio-test" > /dev/null

echo "=== 7. profile_registry::update_avatar ==="
tx_as gas-station update_avatar profile_registry update_avatar "string:https://ex.co/cov-avatar.png" > /dev/null

echo "=== 8. profile_registry::set_slug ==="
SLUG="ori-cov-$(date +%s)"
tx_as gas-station set_slug profile_registry set_slug "string:$SLUG" > /dev/null

echo "=== 9. profile_registry::set_encryption_pubkey ==="
PK_HEX="11111111111111111111111111111111111111111111111111111111111111aa"
tx_as gas-station set_encryption_pubkey profile_registry set_encryption_pubkey \
  "raw_hex:$PK_HEX" > /dev/null

echo "=== 10. paywall::create_paywall ==="
PWID_BEFORE=$(view_int paywall next_id "[]")
tx_as gas-station paywall_create paywall create_paywall \
  "string:Cov test post" "string:ipfs://bafy-cov-paywall-content" u64:55000 string:umin > /dev/null
PWID=$PWID_BEFORE
echo "  paywall id = $PWID"

echo "=== 11. paywall::purchase (alice buys) ==="
tx_as alice-test paywall_purchase paywall purchase u64:$PWID > /dev/null

echo "=== 12. gift_packet::create_directed_gift (gas->alice) ==="
GIFT_BEFORE=$(view_int gift_packet next_id "[]")
tx_as gas-station gift_directed gift_packet create_directed_gift \
  "address:$ALICE" string:umin u64:88000 u8:0 "string:directed gift!" u64:0 > /dev/null
GIFT_DIRECTED=$GIFT_BEFORE
echo "  directed gift id = $GIFT_DIRECTED"

echo "=== 13. gift_packet::claim_directed_gift (alice claims) ==="
tx_as alice-test gift_directed_claim gift_packet claim_directed_gift u64:$GIFT_DIRECTED > /dev/null

echo "=== 14. gift_packet::create_link_gift (link with secret) ==="
GIFT_BEFORE2=$(view_int gift_packet next_id "[]")
SECRET_HEX="aa02468ace1357bd9f0ec1b3d5f7918a2c4e6d8f7b9d1e3f5a7c9b1d3e5f7081"
SECRET_HASH_HEX=$(echo -n $(printf '%s' "$SECRET_HEX" | xxd -r -p) | sha256sum | cut -d' ' -f1)
tx_as gas-station gift_link_create gift_packet create_link_gift \
  string:umin u64:99000 u8:1 "string:link gift!" "raw_hex:$SECRET_HASH_HEX" u64:86400 > /dev/null
GIFT_LINK=$GIFT_BEFORE2
echo "  link gift id = $GIFT_LINK"

echo "=== 15. gift_packet::claim_link_gift (alice claims with secret) ==="
tx_as alice-test gift_link_claim gift_packet claim_link_gift u64:$GIFT_LINK "raw_hex:$SECRET_HEX" > /dev/null

echo "=== 16. subscription_vault::register_plan ==="
tx_as gas-station sub_register subscription_vault register_plan \
  u64:50000 u64:60 string:umin > /dev/null

echo "=== 17. subscription_vault::subscribe (alice → gas-station) ==="
tx_as alice-test sub_subscribe subscription_vault subscribe \
  "address:$OWNER" u64:2 > /dev/null

echo "=== 18. subscription_vault::release_period ==="
sleep 65   # need at least one period elapsed
tx_as gas-station sub_release subscription_vault release_period \
  "address:$ALICE" "address:$OWNER" > /dev/null

echo "=== 19. subscription_vault::cancel_subscription (alice cancels) ==="
tx_as alice-test sub_cancel subscription_vault cancel_subscription \
  "address:$OWNER" > /dev/null

echo "=== 20. wager_escrow::propose_pvp_wager (gas proposes vs alice) ==="
WID_BEFORE=$(view_int wager_escrow next_id "[]")
tx_as gas-station wager_propose wager_escrow propose_pvp_wager \
  "address:$ALICE" string:umin u64:77000 "string:claim-cov" "string:cov-cat" u64:600 > /dev/null
WID=$WID_BEFORE
echo "  wager id = $WID"

echo "=== 21. wager_escrow::accept_wager (alice accepts) ==="
tx_as alice-test wager_accept wager_escrow accept_wager u64:$WID > /dev/null

echo "=== 22. wager_escrow::concede (alice concedes -> gas wins) ==="
tx_as alice-test wager_concede wager_escrow concede u64:$WID > /dev/null

echo "=== 23. prediction_pool::create_market ==="
MID_BEFORE=$(view_int prediction_pool total_markets "[]")
BTC_PRICE=$(curl -s "$REST/connect/oracle/v2/get_price?currency_pair=BTC/USD" --max-time 3 \
  | grep -oE '"price":"[0-9]+"' | head -1 | cut -d'"' -f4)
echo "  BTC price (raw): $BTC_PRICE"
TARGET="${BTC_PRICE:-100000000000}"
tx_as gas-station pred_create prediction_pool create_market \
  string:BTC/USD "u256:$TARGET" bool:true u64:300 string:umin > /dev/null
MID=$MID_BEFORE
echo "  market id = $MID"

echo "=== 24. prediction_pool::stake (alice stakes YES) ==="
tx_as alice-test pred_stake prediction_pool stake \
  u64:$MID bool:true u64:44000 > /dev/null

echo "=== 25. lucky_pool::create_pool ==="
LID_BEFORE=$(view_int lucky_pool next_id "[]")
tx_as gas-station lucky_create lucky_pool create_pool \
  u64:25000 u64:3 string:umin > /dev/null
LID=$LID_BEFORE
echo "  lucky pool id = $LID"

echo "=== 26. lucky_pool::join_pool (alice joins) ==="
tx_as alice-test lucky_join lucky_pool join_pool u64:$LID > /dev/null

echo "=== 27. lucky_pool::join_pool (gas joins to fill) ==="
tx_as gas-station lucky_join_owner lucky_pool join_pool u64:$LID > /dev/null

echo "=== 28. squads::create_squad ==="
SQ_BEFORE=$(view_int squads next_id "[]")
tx_as gas-station squad_create squads create_squad "string:Cov Squad $(date +%s)" > /dev/null
SQ=$SQ_BEFORE
echo "  squad id = $SQ"

echo "=== 29. squads::join_squad (alice joins) ==="
tx_as alice-test squad_join squads join_squad u64:$SQ > /dev/null

echo "=== 30. squads::leave_squad (alice leaves) ==="
tx_as alice-test squad_leave squads leave_squad u64:$SQ > /dev/null

echo "=== 31. reputation::thumbs_up ==="
tx_as alice-test rep_thumbs_up reputation thumbs_up "address:$OWNER" > /dev/null

echo "=== 32. agent_policy::set_policy ==="
tx_as gas-station policy_set agent_policy set_policy "address:$OWNER" u64:10000000 > /dev/null

echo "=== 33. agent_policy::revoke_agent ==="
tx_as gas-station policy_revoke agent_policy revoke_agent "address:$OWNER" > /dev/null

echo ""
echo "============================================================"
echo "RESULTS: $PASS passed, $FAIL failed"
echo "============================================================"
if [ $FAIL -gt 0 ]; then
  echo "Failures:"
  for f in "${FAILS[@]}"; do echo "  - $f"; done
fi
echo ""
echo "Final balances: owner=$(bal $OWNER) alice=$(bal $ALICE) peer=$(bal $PEER)"
