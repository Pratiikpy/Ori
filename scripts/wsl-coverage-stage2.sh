#!/usr/bin/env bash
# Stage 2 of full coverage. Re-creates objects (paywall, gift, wager, market,
# pool, squad) and immediately runs the second-stage interaction (purchase,
# claim, accept, stake, join, etc.) using the ID parsed from the create tx's
# event log.
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
LOG="/tmp/ori-coverage-2.log"
: > "$LOG"

PASS=0
FAIL=0
declare -a FAILS

# Run a Move tx as a given keyring key. On success, sets globals
#   _LAST_HASH, _LAST_HEIGHT
# and returns 0; otherwise returns 1.
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
  local code txhash
  code=$(echo "$out" | tail -1 | grep -oE '"code":[0-9]+' | head -1 | grep -oE '[0-9]+')
  txhash=$(echo "$out" | tail -1 | grep -oE '"txhash":"[A-F0-9]+"' | head -1 | cut -d'"' -f4)
  if [ "${code:-1}" != "0" ]; then
    printf "  [FAIL] %-32s code=%s\n" "$label" "${code:-?}" | tee -a "$LOG"
    FAIL=$((FAIL+1))
    FAILS+=("$label code=${code:-?}")
    sleep 2
    return 1
  fi
  sleep 4
  local rec
  rec=$(minitiad q tx "$txhash" --node "$NODE" --output json 2>&1)
  local rcode height
  rcode=$(echo "$rec" | grep -oE '"code":[0-9]+' | head -1 | grep -oE '[0-9]+')
  height=$(echo "$rec" | grep -oE '"height":"[0-9]+"' | head -1 | cut -d'"' -f4)
  if [ "${rcode:-1}" != "0" ]; then
    local raw_log
    raw_log=$(echo "$rec" | grep -oE '"raw_log":"[^"]*"' | head -1 | head -c 200)
    printf "  [FAIL] %-32s rcode=%s log=%s\n" "$label" "$rcode" "$raw_log" | tee -a "$LOG"
    FAIL=$((FAIL+1))
    FAILS+=("$label rcode=$rcode")
    return 1
  fi
  printf "  [PASS] %-32s tx=%s height=%s\n" "$label" "${txhash:0:14}..." "$height" | tee -a "$LOG"
  PASS=$((PASS+1))
  _LAST_HASH="$txhash"
  _LAST_HEIGHT="$height"
  return 0
}

# Extract the `id` attribute from the matching move event in the last tx.
# Args: <event_type_substring>  e.g. PaywallCreated, GiftCreated, WagerProposed
get_id_from_last() {
  local needle="$1"
  local h="${_LAST_HEIGHT:-0}"
  curl -s "$REST/cosmos/tx/v1beta1/txs?query=tx.height%3D$h&limit=5" \
    | python3 -c "
import json,sys
needle=sys.argv[1]
d=json.load(sys.stdin)
for r in d.get('tx_responses',[]):
  for e in r.get('events',[]):
    if e.get('type')=='move':
      tag=''
      for a in e.get('attributes',[]):
        if a.get('key')=='type_tag': tag=a['value']
      if needle in tag:
        for a in e.get('attributes',[]):
          if a.get('key')=='id':
            print(a['value']); sys.exit(0)
        for a in e.get('attributes',[]):
          if a.get('key')=='data':
            try:
              j=json.loads(a['value'])
              for k in ('id','gift_id','wager_id','market_id','pool_id','squad_id','plan_id'):
                if k in j: print(j[k]); sys.exit(0)
            except: pass
print('')" "$needle"
}

bal() {
  curl -s "$REST/cosmos/bank/v1beta1/balances/$1" --max-time 3 \
    | grep -oE '"amount":"[0-9]+"' | head -1 | cut -d'"' -f4
}

echo "============================================================"
echo "STAGE 2: TWO-STAGE FLOW BATTERY (with ID extraction)"
echo "============================================================"

echo "=== Make sure alice has funds ==="
tx_as gas-station prefund_alice payment_router send \
  "address:$ALICE" string:umin u64:5000000000 string:prefund-stage2 string:funding > /dev/null
echo "  alice balance: $(bal $ALICE)"

echo ""
echo "=== A. follow_graph::follow (gas -> alice) ==="
tx_as gas-station follow follow_graph follow "address:$ALICE" > /dev/null

echo ""
echo "=== B. Paywall: create + purchase ==="
if tx_as gas-station paywall_create paywall create_paywall \
  "string:S2 cov post" "string:ipfs://s2-cov-content" u64:55000 string:umin > /dev/null; then
  PWID=$(get_id_from_last PaywallCreated)
  echo "  paywall id=$PWID"
  if [ -n "$PWID" ]; then
    tx_as alice-test paywall_purchase paywall purchase u64:$PWID > /dev/null
  else
    echo "  [SKIP] could not extract paywall id"
  fi
fi

echo ""
echo "=== C. Gift directed: create + claim ==="
if tx_as gas-station gift_directed gift_packet create_directed_gift \
  "address:$ALICE" string:umin u64:88000 u8:0 "string:s2 directed" u64:0 > /dev/null; then
  GID=$(get_id_from_last DirectedGiftCreated)
  [ -z "$GID" ] && GID=$(get_id_from_last GiftCreated)
  echo "  gift id=$GID"
  if [ -n "$GID" ]; then
    tx_as alice-test gift_directed_claim gift_packet claim_directed_gift u64:$GID > /dev/null
  fi
fi

echo ""
echo "=== D. Gift link: create + claim ==="
SECRET_HEX="aa02468ace1357bd9f0ec1b3d5f7918a2c4e6d8f7b9d1e3f5a7c9b1d3e5f7081"
SECRET_HASH_HEX=$(printf '%s' "$SECRET_HEX" | xxd -r -p | sha256sum | cut -d' ' -f1)
if tx_as gas-station gift_link_create gift_packet create_link_gift \
  string:umin u64:99000 u8:1 "string:s2 link gift" "raw_hex:$SECRET_HASH_HEX" u64:86400 > /dev/null; then
  GIDL=$(get_id_from_last LinkGiftCreated)
  [ -z "$GIDL" ] && GIDL=$(get_id_from_last GiftCreated)
  echo "  link gift id=$GIDL"
  if [ -n "$GIDL" ]; then
    tx_as alice-test gift_link_claim gift_packet claim_link_gift u64:$GIDL "raw_hex:$SECRET_HEX" > /dev/null
  fi
fi

echo ""
echo "=== E. Subscription: register + subscribe + cancel ==="
if tx_as gas-station sub_register subscription_vault register_plan u64:50000 u64:60 string:umin > /dev/null; then
  tx_as alice-test sub_subscribe subscription_vault subscribe "address:$OWNER" u64:1 > /dev/null
  tx_as alice-test sub_cancel subscription_vault cancel_subscription "address:$OWNER" > /dev/null
fi

echo ""
echo "=== F. Wager: propose + accept + concede ==="
if tx_as gas-station wager_propose wager_escrow propose_pvp_wager \
  "address:$ALICE" string:umin u64:77000 "string:s2 claim" "string:s2-cat" u64:600 > /dev/null; then
  WID=$(get_id_from_last WagerProposed)
  [ -z "$WID" ] && WID=$(get_id_from_last WagerCreated)
  echo "  wager id=$WID"
  if [ -n "$WID" ]; then
    tx_as alice-test wager_accept wager_escrow accept_wager u64:$WID > /dev/null
    tx_as alice-test wager_concede wager_escrow concede u64:$WID > /dev/null
  fi
fi

echo ""
echo "=== G. Prediction market: create + stake ==="
if tx_as gas-station pred_create prediction_pool create_market \
  string:BTC/USD u256:7482442977 bool:true u64:300 string:umin > /dev/null; then
  MID=$(get_id_from_last MarketCreated)
  [ -z "$MID" ] && MID=$(get_id_from_last MarketOpened)
  echo "  market id=$MID"
  if [ -n "$MID" ]; then
    tx_as alice-test pred_stake prediction_pool stake u64:$MID bool:true u64:44000 > /dev/null
  fi
fi

echo ""
echo "=== H. Lucky pool: create + join ==="
if tx_as gas-station lucky_create lucky_pool create_pool u64:25000 u64:3 string:umin > /dev/null; then
  LID=$(get_id_from_last PoolCreated)
  [ -z "$LID" ] && LID=$(get_id_from_last LuckyPoolCreated)
  echo "  lucky id=$LID"
  if [ -n "$LID" ]; then
    tx_as alice-test lucky_join lucky_pool join_pool u64:$LID > /dev/null
  fi
fi

echo ""
echo "=== I. Squad: create + join + leave ==="
if tx_as gas-station squad_create squads create_squad "string:S2 Squad $(date +%s)" > /dev/null; then
  SID=$(get_id_from_last SquadCreated)
  echo "  squad id=$SID"
  if [ -n "$SID" ]; then
    tx_as alice-test squad_join squads join_squad u64:$SID > /dev/null
    tx_as alice-test squad_leave squads leave_squad u64:$SID > /dev/null
  fi
fi

echo ""
echo "============================================================"
echo "RESULTS: $PASS passed, $FAIL failed"
echo "============================================================"
if [ $FAIL -gt 0 ]; then
  echo "Failures:"
  for f in "${FAILS[@]}"; do echo "  - $f"; done
fi
echo "Final balances: owner=$(bal $OWNER) alice=$(bal $ALICE) peer=$(bal $PEER)"
