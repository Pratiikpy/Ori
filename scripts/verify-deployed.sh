#!/usr/bin/env bash
# verify-deployed.sh — Smoke-test the deployed Ori app end to end.
#
# Run after every deploy or env-var change. Probes every public surface:
#   1. Chain health (api → rollup RPC reachable, oracle returning data)
#   2. Auth flow (challenge endpoint reachable, JWT-protected endpoints
#      require Bearer)
#   3. A2A (.well-known/agent.json with the right shape)
#   4. Public reads (sponsor, discover, leaderboards, profile lookups,
#      L1 username resolution)
#   5. Security guards (agent-log shared secret, 401 on unauth)
#
# Exit codes:
#   0 — all checks passed
#   1 — at least one check failed (specifics printed in summary)
#
# Usage:
#   bash scripts/verify-deployed.sh                    # default base URL
#   BASE=https://ori-foo.vercel.app/api ./verify.sh    # custom base

set -uo pipefail

BASE="${BASE:-https://ori-chi-rosy.vercel.app/api}"
ORI_ADDR="${ORI_ADDR:-init1qhwsccy884xexevd29z06ps4hnay8ff6szgkt2}"
PASS=0
FAIL=0
FAILS=()

check() {
  local label="$1"; local result="$2"; local expected="$3"
  if echo "$result" | grep -q "$expected"; then
    echo "  [PASS] $label"
    PASS=$((PASS + 1))
  else
    echo "  [FAIL] $label"
    echo "         expected pattern: $expected"
    echo "         got: $(echo "$result" | head -c 200)"
    FAIL=$((FAIL + 1))
    FAILS+=("$label")
  fi
}

echo "Ori deployment verifier — base = $BASE"
echo "==========================================================="

echo
echo "─── 1. Chain reachability (health/deep) ───────────────────"
out=$(curl -sS -m 30 "$BASE/health/deep" 2>&1)
check "chain.ok=true"      "$out" '"ok":true'
check "db.ok=true"         "$out" '"db":{"ok":true}'
check "redis.ok=true"      "$out" '"redis":{"ok":true'
check "chain.tip>0"        "$out" '"tip":[1-9]'

echo
echo "─── 2. Oracle (Slinky feed) ──────────────────────────────"
out=$(curl -sS -m 15 "$BASE/v1/oracle/price?pair=BTC/USD" 2>&1)
check "BTC/USD price returned"   "$out" '"price":"[0-9]\+"'
check "BTC/USD has decimals"     "$out" '"decimals":'

echo
echo "─── 3. Auth flow ──────────────────────────────────────────"
out=$(curl -sS -m 15 -X POST "$BASE/v1/auth/challenge" \
  -H 'Content-Type: application/json' \
  -d "{\"initiaAddress\":\"$ORI_ADDR\"}")
check "challenge returns nonce"   "$out" '"nonce":"[a-f0-9]\+"'
check "challenge has message"     "$out" '"challenge":"Ori Sign-In'

code=$(curl -sS -o /dev/null -w "%{http_code}" -m 10 "$BASE/v1/chats")
check "GET /v1/chats unauth = 401"  "[$code]" "\[401\]"

code=$(curl -sS -o /dev/null -w "%{http_code}" -m 10 -X POST \
  "$BASE/v1/agent/log" -H 'Content-Type: application/json' -d '{}')
check "POST /v1/agent/log no-secret = 401"  "[$code]" "\[401\]"

echo
echo "─── 4. A2A agent card ─────────────────────────────────────"
out=$(curl -sS -m 15 "$BASE/.well-known/agent.json")
check "agent.json valid JSON"     "$out" '"schemaVersion":'
check "agent.json has bearer auth" "$out" '"bearer"'
check "agent.json has streaming"   "$out" '"streaming":true'

echo
echo "─── 5. Public reads ───────────────────────────────────────"
out=$(curl -sS -m 15 "$BASE/v1/sponsor/status")
check "sponsor.enabled boolean"   "$out" '"enabled":\(true\|false\)'

out=$(curl -sS -m 15 "$BASE/v1/discover/recent")
check "discover/recent shape"     "$out" '"entries":'

out=$(curl -sS -m 15 "$BASE/v1/leaderboards/top-creators")
check "leaderboards shape"        "$out" '"entries":'

out=$(curl -sS -m 15 "$BASE/v1/leaderboards/global-stats")
check "global-stats shape"        "$out" '"totalUsers":'

out=$(curl -sS -m 15 "$BASE/v1/profiles/$ORI_ADDR")
check "profile lookup shape"      "$out" '"address":"init1'

out=$(curl -sS -m 15 "$BASE/v1/profiles/$ORI_ADDR/follow-stats")
check "follow-stats shape"        "$out" '"followers":'

out=$(curl -sS -m 15 "$BASE/v1/profiles/$ORI_ADDR/badges")
check "badges shape"              "$out" '"badges":'

echo
echo "─── 6. L1 .init resolution ────────────────────────────────"
# Direct L1 view fn — independent of our API
out=$(curl -sS -m 10 "https://rest.testnet.initia.xyz/initia/move/v1/view" \
  -H 'Content-Type: application/json' \
  -d '{"address":"0x42cd8467b1c86e59bf319e5664a09b6b5840bb3fac64f5ce690b5041c530565a","module_name":"usernames","function_name":"get_address_from_name","type_args":[],"args":["BWFsaWNl"]}')
check "L1 username view fn"       "$out" '"data":'

echo
echo "==========================================================="
echo "  RESULTS: $PASS passed, $FAIL failed"
echo "==========================================================="
if [ $FAIL -gt 0 ]; then
  echo
  echo "Failures:"
  for f in "${FAILS[@]}"; do
    echo "  - $f"
  done
  exit 1
fi
echo
echo "All checks passed — Ori is fully operational at $BASE"
