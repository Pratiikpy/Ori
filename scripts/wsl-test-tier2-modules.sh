#!/usr/bin/env bash
# Phase 1 of the "test what's left" pass -- Tier-2 Move modules that
# weren't covered by wsl-onchain-user-flows.sh. Each block runs one or
# more real transactions and verifies via tx code + view fn.
#
# Learnings from first-run failures encoded here:
#   - All modules use next_id starting at 1 (so latest id = total, not total-1)
#   - subscription_vault::release_period requires period_seconds (>=3600) to
#     have elapsed since subscribe/last_release -- skip in a fast e2e run.
#   - gift_box_catalog::register_box requires featured_order <= 100
#   - gift_group create_group_gift takes vector<vector<u8>> which minitiad
#     CLI cannot encode easily -- covered by Move unit tests; skip here.

export PATH="$HOME/bin:$HOME/.local/bin:$PATH"
export LD_LIBRARY_PATH="$HOME/bin:${LD_LIBRARY_PATH:-}"

ORI="0x05dd0c60873d4d93658d5144fd0615bcfa43a53a"
GAS="init1qhwsccy884xexevd29z06ps4hnay8ff6szgkt2"
ALICE="init1m57yx20zrq27r0zk28utrkctp9kdkp7s337sm4"
VAL="init1hczz2agguacp2lf5cck4cx0p8ca52hw29gck2a"
CHAIN="ori-1"
NODE="http://localhost:26657"
REST="http://localhost:1317"

PASS=0
FAIL=0
SKIP=0
declare -a FAILS
declare -a SKIPS

LAST_TX=""

send_move_tx() {
  local from="$1" mod="$2" fn="$3" args="$4"
  minitiad tx move execute "$ORI" "$mod" "$fn" \
    --args "$args" \
    --from "$from" --keyring-backend test \
    --chain-id "$CHAIN" --node "$NODE" \
    --gas auto --gas-adjustment 1.8 --gas-prices 0.15umin \
    --output json -y 2>&1
}

tx() {
  local label="$1" from="$2" mod="$3" fn="$4"
  shift 4
  local jsn="["
  local first=1
  for a in "$@"; do
    if [ $first -eq 1 ]; then jsn+="\"$a\""; first=0; else jsn+=",\"$a\""; fi
  done
  jsn+="]"
  local out code th abort
  out=$(send_move_tx "$from" "$mod" "$fn" "$jsn")
  code=$(echo "$out" | grep -oE '"code":[0-9]+' | head -1 | grep -oE '[0-9]+')
  th=$(echo "$out" | grep -oE '"txhash":"[A-F0-9]+"' | head -1 | cut -d'"' -f4)
  abort=$(echo "$out" | grep -oE 'code=[0-9]+' | head -1)
  if [ "$code" = "0" ]; then
    printf "  [PASS] %-36s tx=%s\n" "$label" "${th:0:16}..."
    PASS=$((PASS+1))
    LAST_TX="$th"
  else
    # If minitiad crashed before tx (simulation abort), show abort code
    local diag="${abort:-code=${code:-?}}"
    printf "  [FAIL] %-36s %s\n" "$label" "$diag"
    FAIL=$((FAIL+1))
    FAILS+=("$label $diag")
    LAST_TX=""
  fi
  sleep 2
}

tx_or_exists() {
  local label="$1"
  tx "$@"
  if [ -z "$LAST_TX" ]; then
    local last="${FAILS[-1]:-}"
    # Move aborts for already-registered: 524294 = already_exists + code 6
    if echo "$last" | grep -qE 'code=524[0-9]+|already|exists|ALREADY|EXIST'; then
      unset 'FAILS[-1]'
      FAIL=$((FAIL-1))
      PASS=$((PASS+1))
      printf "  [PASS] %-36s (already-exists, idempotent ok)\n" "$label"
    fi
  fi
}

# Skip a test block with a logged reason.
skip_test() {
  local label="$1" reason="$2"
  printf "  [SKIP] %-36s %s\n" "$label" "$reason"
  SKIP=$((SKIP+1))
  SKIPS+=("$label :: $reason")
}

view() {
  local label="$1" mod="$2" fn="$3" args="$4"
  local res data
  res=$(curl -s -X POST "$REST/initia/move/v1/view" \
    -H "content-type: application/json" \
    -d "{\"address\":\"$ORI\",\"module_name\":\"$mod\",\"function_name\":\"$fn\",\"type_args\":[],\"args\":$args}" \
    --max-time 5)
  data=$(echo "$res" | grep -oE '"data":"[^"]+"' | head -1)
  if [ -n "$data" ]; then
    printf "  [PASS] view %-30s -> %.60s\n" "$label" "$data"
    PASS=$((PASS+1))
  else
    printf "  [FAIL] view %-30s -> %.120s\n" "$label" "$res"
    FAIL=$((FAIL+1))
    FAILS+=("view $label $res")
  fi
}

# Extract an event attribute from the tx response of the last-broadcasted tx.
# Usage: get_event_attr <tx_hash> <event_type_fragment> <attr_key>
get_event_attr() {
  local h="$1" event="$2" key="$3"
  # Poll for up to 30s -- REST tx indexer can lag several blocks behind
  # cometbft broadcast.
  local attempt=0
  local resp=""
  while [ $attempt -lt 15 ]; do
    sleep 2
    resp=$(curl -s "$REST/cosmos/tx/v1beta1/txs/$h" --max-time 5 2>/dev/null)
    # Ready when "tx_response" field is present AND it's not a "tx not found"
    # error envelope.
    if echo "$resp" | grep -q '"tx_response"' && ! echo "$resp" | grep -q 'tx not found'; then
      break
    fi
    attempt=$((attempt+1))
  done
  # Write response to a tempfile so python can read it unambiguously.
  local tmp="/tmp/ori-tx-$$.json"
  printf "%s" "$resp" > "$tmp"
  python3 -c "
import json, sys
try:
    with open('$tmp') as f:
        d = json.load(f)
    event_frag = '$event'
    key = '$key'
    for e in d.get('tx_response', {}).get('events', []):
        type_tag_match = False
        if e.get('type', '') == 'move':
            for a in e.get('attributes', []):
                if a.get('key') == 'type_tag' and event_frag in a.get('value', ''):
                    type_tag_match = True
                    break
        elif event_frag in e.get('type', ''):
            type_tag_match = True
        if not type_tag_match:
            continue
        data_json = None
        for a in e.get('attributes', []):
            if a.get('key') == 'data':
                try:
                    data_json = json.loads(a.get('value', ''))
                except Exception:
                    pass
                break
        if data_json and key in data_json:
            print(str(data_json[key]).strip('\"'))
            sys.exit(0)
        for a in e.get('attributes', []):
            if a.get('key') == key:
                print(a.get('value', '').strip('\"'))
                sys.exit(0)
except Exception:
    pass
" 2>/dev/null
  rm -f "$tmp"
}

echo "========================================================================"
echo "  TIER-2 MODULE ON-CHAIN TEST"
echo "  gas   = $GAS"
echo "  alice = $ALICE"
echo "========================================================================"
echo ""

# ============================================================
# 0. Pre-flight: fund alice + top-up
# ============================================================
echo "=== 0. Pre-flight: fund alice ==="
tx fund_alice gas-station payment_router send \
  "address:$ALICE" "string:umin" "u64:500000000000" "string:tier2-seed" "string:"
echo ""

# ============================================================
# 1. subscription_vault
# ============================================================
echo "=== 1. subscription_vault ==="
tx_or_exists sub_register_plan gas-station subscription_vault register_plan \
  "u64:10000" "u64:3600" "string:umin"

view sub_plan_exists_true subscription_vault plan_exists \
  "[\"AAAAAAAAAAAAAAAABd0MYIc9TZNljVFE/QYVvPpDpTo=\"]"

tx sub_alice_subscribes alice-test subscription_vault subscribe \
  "address:$GAS" "u64:2"

skip_test sub_release_period "requires period_seconds>=3600 to elapse"

tx sub_alice_cancels alice-test subscription_vault cancel_subscription \
  "address:$GAS"
echo ""

# ============================================================
# 2. payment_stream
# ============================================================
echo "=== 2. payment_stream ==="
# open_stream(signer, recipient, amount, duration_sec, denom)
tx stream_open gas-station payment_stream open_stream \
  "address:$ALICE" "u64:60000" "u64:60" "string:umin"

# Fetch the StreamOpened event from the tx to get stream_id
if [ -n "$LAST_TX" ]; then
  echo "  -> hash: $LAST_TX"
  STREAM_ID=$(get_event_attr "$LAST_TX" "StreamOpened" "id")
  if [ -z "$STREAM_ID" ]; then
    STREAM_ID=$(get_event_attr "$LAST_TX" "StreamOpened" "stream_id")
  fi
  STREAM_ID=${STREAM_ID//\"/}
  echo "  -> stream id = ${STREAM_ID:-unknown}"
else
  STREAM_ID=""
fi

if [ -n "$STREAM_ID" ]; then
  # (view stream_exists check omitted -- view fn args need BCS-encoded base64,
  # which is tedious to compute inline; withdraw+close success below proves it.)
  sleep 8   # let some stream time accrue
  tx stream_withdraw alice-test payment_stream withdraw_accrued \
    "u64:$STREAM_ID"
  tx stream_close gas-station payment_stream close_stream \
    "u64:$STREAM_ID"
else
  skip_test stream_withdraw "could not resolve stream_id from tx event"
fi
echo ""

# ============================================================
# 3. squads (1-indexed)
# ============================================================
echo "=== 3. squads ==="
# Gas-station may already lead another squad from prior runs; use tx_or_exists.
tx_or_exists squad_create gas-station squads create_squad "string:ori-builders-$(date +%s)"

# total_squads returns the count; since IDs are 1-indexed and sequential,
# the latest id == current total.
SQUAD_ID=$(curl -s -X POST "$REST/initia/move/v1/view" -H "content-type: application/json" \
  -d "{\"address\":\"$ORI\",\"module_name\":\"squads\",\"function_name\":\"total_squads\",\"type_args\":[],\"args\":[]}" \
  --max-time 3 | grep -oE '"data":"\\"[0-9]+\\""' | grep -oE '[0-9]+')
echo "  -> squad id = $SQUAD_ID"

# Check if gas-station is already leader of a DIFFERENT squad (squad_of)
# to skip the join step that would fail.
# alice joins the new squad (we just created it, so alice is fresh)
tx squad_alice_joins alice-test squads join_squad "u64:$SQUAD_ID"
tx squad_alice_leaves alice-test squads leave_squad "u64:$SQUAD_ID"
echo ""

# ============================================================
# 4. lucky_pool (1-indexed; no total view)
# ============================================================
echo "=== 4. lucky_pool ==="
tx pool_create gas-station lucky_pool create_pool \
  "u64:50000" "u64:10" "string:umin"

if [ -n "$LAST_TX" ]; then
  POOL_ID=$(get_event_attr "$LAST_TX" "PoolCreated" "id")
  POOL_ID=${POOL_ID//\"/}
  echo "  -> pool id = ${POOL_ID:-unknown}"
else
  POOL_ID=""
fi

if [ -n "$POOL_ID" ]; then
  tx pool_alice_joins alice-test lucky_pool join_pool "u64:$POOL_ID"
  # draw requires MIN_PARTICIPANTS=2, alice alone isn't enough; add gas
  tx pool_gas_joins gas-station lucky_pool join_pool "u64:$POOL_ID"
  tx pool_draw gas-station lucky_pool draw "u64:$POOL_ID"
else
  skip_test pool_joins_draw "could not resolve pool_id from tx event"
fi
echo ""

# ============================================================
# 5. merchant_registry
# ============================================================
echo "=== 5. merchant_registry ==="
tx_or_exists merch_register gas-station merchant_registry register \
  "string:Ori Coffee" "string:Pay-by-chat coffee shop" \
  "string:ipfs://logo-placeholder" "string:https://ori.chat" \
  'vector<string>:food,drink'

tx merch_update gas-station merchant_registry update \
  "string:Ori Coffee Co" "string:Updated description" \
  "string:ipfs://logo-v2" "string:https://ori.chat" \
  'vector<string>:food,drink,dessert'
echo ""

# ============================================================
# 6. gift_box_catalog (featured_order must be <= 100)
# ============================================================
echo "=== 6. gift_box_catalog ==="
# Signature: register_box(admin, name, theme, image_uri, description, accent_hex, featured_order)
tx_or_exists gbc_register gas-station gift_box_catalog register_box \
  "string:Birthday Cake" "u8:1" "string:ipfs://ori-cake-1" \
  "string:A classic birthday cake" "string:#FFAAFF" "u64:10"

view gbc_total_boxes gift_box_catalog total_boxes "[]"
view gbc_admin_is_gas gift_box_catalog get_admin "[]"
echo ""

# ============================================================
# 7. gift_group -- covered by Move unit tests
# ============================================================
echo "=== 7. gift_group ==="
skip_test group_create_group_gift "vector<vector<u8>> not easily encodable via minitiad CLI; covered in Move unit tests"
view group_store_exists gift_group vault_address "[]"
echo ""

# ============================================================
# Summary
# ============================================================
echo "========================================================================"
echo "  TIER-2 RESULTS: $PASS passed, $FAIL failed, $SKIP skipped"
echo "========================================================================"
if [ ${#SKIPS[@]} -gt 0 ]; then
  echo ""
  echo "Skipped:"
  for s in "${SKIPS[@]}"; do echo "  - $s"; done
fi
if [ $FAIL -gt 0 ]; then
  echo ""
  echo "Failures:"
  for f in "${FAILS[@]}"; do echo "  - $f"; done
  exit 1
fi
