#!/usr/bin/env bash
# End-to-end user journey smoke test against running API on localhost:3001.
# Uses actual Fastify routes verified via grep against apps/api/src/routes/*.ts.
# Run from Git Bash on Windows (API runs in same context).

API="http://localhost:3001"
ADDR="init1qhwsccy884xexevd29z06ps4hnay8ff6szgkt2"    # gas-station / deployer
SHORT="AbC123DefSample1"
PASS=0
FAIL=0
declare -a FAILS

test_endpoint() {
  local label="$1"
  local method="$2"
  local path="$3"
  local expected="$4"
  local body="${5:-}"
  local headers="${6:-}"

  local args=(-s -o /dev/null -w "%{http_code}" --max-time 10 -X "$method")
  if [ -n "$body" ]; then args+=(-H "content-type: application/json" -d "$body"); fi
  if [ -n "$headers" ]; then args+=(-H "$headers"); fi
  local code
  code=$(curl "${args[@]}" "$API$path" 2>/dev/null || echo "000")
  if echo "$expected" | grep -qw "$code"; then
    printf "  [PASS %3s] %-35s %s\n" "$code" "$label" "$path"
    PASS=$((PASS+1))
  else
    printf "  [FAIL %3s] %-35s %s  (want %s)\n" "$code" "$label" "$path" "$expected"
    FAIL=$((FAIL+1))
    FAILS+=("$label  $path  got=$code want=$expected")
  fi
}

echo "======================================================================"
echo " ORI USER-JOURNEY TEST  api=$API  addr=$ADDR"
echo "======================================================================"
echo ""

echo "=== 1. Health + infra ==="
test_endpoint "health"          GET  "/health"                      "200"
test_endpoint "health_ready"    GET  "/health/ready"                "200 503"
test_endpoint "health_deep"     GET  "/health/deep"                 "200 503"
test_endpoint "agent_card"      GET  "/.well-known/agent.json"      "200"
echo ""

echo "=== 2. Oracle (Connect) ==="
test_endpoint "price_btc"       GET  "/v1/oracle/price?pair=BTC/USD"  "200"
test_endpoint "price_eth"       GET  "/v1/oracle/price?pair=ETH/USD"  "200"
test_endpoint "price_sol"       GET  "/v1/oracle/price?pair=SOL/USD"  "200"
test_endpoint "price_bnb"       GET  "/v1/oracle/price?pair=BNB/USD"  "200"
test_endpoint "price_atom"      GET  "/v1/oracle/price?pair=ATOM/USD" "200"
test_endpoint "price_init_404"  GET  "/v1/oracle/price?pair=INIT/USD" "404"
test_endpoint "tickers"         GET  "/v1/oracle/tickers"             "200"
echo ""

echo "=== 3. Profile / read endpoints ==="
test_endpoint "profile"         GET  "/v1/profiles/$ADDR"                      "200 404"
test_endpoint "badges"          GET  "/v1/profiles/$ADDR/badges"               "200"
test_endpoint "activity"        GET  "/v1/profiles/$ADDR/activity"             "200"
test_endpoint "weekly_stats"    GET  "/v1/profiles/$ADDR/weekly-stats"         "200"
test_endpoint "follow_stats"    GET  "/v1/profiles/$ADDR/follow-stats"         "200"
test_endpoint "followers"       GET  "/v1/profiles/$ADDR/followers"            "200"
test_endpoint "following"       GET  "/v1/profiles/$ADDR/following"            "200"
test_endpoint "top_tippers_of"  GET  "/v1/profiles/$ADDR/top-tippers"          "200"
test_endpoint "trust_score"     GET  "/v1/profiles/$ADDR/trust-score"          "200"
test_endpoint "portfolio"       GET  "/v1/profiles/$ADDR/portfolio"            "200"
test_endpoint "quests"          GET  "/v1/profiles/$ADDR/quests"               "200"
test_endpoint "encrypt_pubkey"  GET  "/v1/profiles/$ADDR/encryption-pubkey"    "200 404"
echo ""

echo "=== 4. Leaderboards ==="
test_endpoint "top_creators"    GET  "/v1/leaderboards/top-creators?limit=5"  "200"
test_endpoint "top_tippers_all" GET  "/v1/leaderboards/top-tippers?limit=5"   "200"
test_endpoint "global_stats"    GET  "/v1/leaderboards/global-stats"          "200"
echo ""

echo "=== 5. Discover ==="
test_endpoint "disc_top"        GET  "/v1/discover/top-creators?limit=5"       "200"
test_endpoint "disc_recent"     GET  "/v1/discover/recent?limit=5"             "200"
test_endpoint "disc_rising"     GET  "/v1/discover/rising?limit=5"             "200"
echo ""

echo "=== 6. Auth flow ==="
test_endpoint "auth_challenge"  POST "/v1/auth/challenge" "200 201" \
  "{\"initiaAddress\":\"$ADDR\"}"
test_endpoint "auth_me_401"     GET  "/v1/auth/me"                             "401 403"
echo ""

echo "=== 7. Gift links ==="
test_endpoint "link_preview"    GET  "/v1/links/$SHORT"                        "200 404"
echo ""

echo "=== 8. Push ==="
test_endpoint "push_vapid"      GET  "/v1/push/vapid-key"                      "200"
echo ""

echo "=== 9. Sponsor / onboarding ==="
test_endpoint "sponsor_status"  GET  "/v1/sponsor/status"                      "200"
echo ""

echo "=== 10. Agent attribution (R9) ==="
IDEM=$(node -e "console.log(require('crypto').randomUUID().replace(/-/g,''))" 2>/dev/null || echo "abcdef0123456789abcdef0123456789")
BODY="{\"ownerAddr\":\"$ADDR\",\"agentAddr\":\"$ADDR\",\"toolName\":\"ori.send_tip\",\"argsJson\":{\"creator\":\"alice.init\",\"amount\":\"0.5\"},\"promptHash\":\"a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2\",\"status\":\"success\"}"
test_endpoint "agent_log"       POST "/v1/agent/log" "201" "$BODY" "idempotency-key: $IDEM"
test_endpoint "agent_actions"   GET  "/v1/agent/$ADDR/actions?limit=3"         "200"
test_endpoint "agent_user_acts" GET  "/v1/agent/user/$ADDR/actions?limit=3"    "200"
echo ""

echo "=== 11. Agent schedule (R10) ==="
IDEM2=$(node -e "console.log(require('crypto').randomUUID().replace(/-/g,''))" 2>/dev/null || echo "fedcba9876543210fedcba9876543210")
SBODY="{\"ownerAddr\":\"$ADDR\",\"agentAddr\":\"$ADDR\",\"kind\":\"tip\",\"args\":{\"creator\":\"alice.init\",\"amount\":\"0.1\"},\"runInSeconds\":120}"
test_endpoint "agent_schedule"  POST "/v1/agent/schedule" "202" "$SBODY" "idempotency-key: $IDEM2"
echo ""

echo "=== 12. Idempotency replay (R2) ==="
# Replay the agent_log POST with the same idem key. Expect same 201 + X-Idempotent-Replay: hit.
test_endpoint "agent_log_replay" POST "/v1/agent/log" "201" "$BODY" "idempotency-key: $IDEM"
echo "  Replay headers:"
curl -s -D - -X POST -H "content-type: application/json" -H "idempotency-key: $IDEM" \
  -d "$BODY" "$API/v1/agent/log" --max-time 5 -o /dev/null 2>&1 | grep -iE "^(HTTP|x-idempotent)" | head -3
echo ""

echo "======================================================================"
echo " RESULTS: $PASS passed, $FAIL failed"
echo "======================================================================"
if [ $FAIL -gt 0 ]; then
  echo ""; echo "Failures:"
  for f in "${FAILS[@]}"; do echo "  - $f"; done
  exit 1
fi
