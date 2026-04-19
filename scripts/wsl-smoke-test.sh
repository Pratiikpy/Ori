#!/usr/bin/env bash
# Full-stack smoke test for Ori. Checks chain, oracle, module views, API endpoints.
# Safe to re-run — read-only queries only.
export PATH="$HOME/bin:$HOME/.local/bin:$PATH"
export LD_LIBRARY_PATH="$HOME/bin:${LD_LIBRARY_PATH:-}"

MODULE="0x05dd0c60873d4d93658d5144fd0615bcfa43a53a"
API="http://localhost:3001"
REST="http://localhost:1317"
RPC="http://localhost:26657"

pass() { echo "[PASS] $1"; }
fail() { echo "[FAIL] $1"; }
info() { echo "[INFO] $1"; }

echo "=== 1. Rollup infra ==="

systemctl --user is-active minitiad >/dev/null && pass "minitiad unit active" || fail "minitiad unit inactive"
systemctl --user is-active opinitd.executor.service >/dev/null && pass "opinitd executor active" || fail "opinitd executor inactive"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$REST/cosmos/base/tendermint/v1beta1/blocks/latest" --max-time 5)
if [ "$STATUS" = "200" ]; then pass "REST 200 ($REST)"; else fail "REST $STATUS"; fi

BLOCK=$(curl -s "$REST/cosmos/base/tendermint/v1beta1/blocks/latest" --max-time 5 | sed -nE 's/.*"height":"([0-9]+)".*/\1/p' | head -1)
if [ -n "$BLOCK" ]; then pass "Latest block height: $BLOCK"; else fail "Cannot read block height"; fi

echo ""
echo "=== 2. Docker deps (postgres + redis) ==="
docker ps --format '{{.Names}} {{.State}}' 2>/dev/null | grep -E "postgres|redis" || fail "docker deps not running"

echo ""
echo "=== 3. Oracle feeds (direct upstream) ==="
for pair in INIT/USD BTC/USD ETH/USD SOL/USD DOGE/USD; do
  PRICE=$(curl -s "$REST/connect/oracle/v2/get_price?currency_pair=$pair" --max-time 5 | sed -nE 's/.*"price":"([0-9]+)".*/\1/p' | head -1)
  if [ -n "$PRICE" ]; then pass "Oracle $pair = $PRICE (raw)"; else fail "Oracle $pair failed"; fi
done

echo ""
echo "=== 4. prediction_pool module on-chain ==="
EXISTS=$(curl -s "$REST/initia/move/v1/accounts/$MODULE/modules/prediction_pool" --max-time 5 | head -c 100)
if echo "$EXISTS" | grep -q "prediction_pool"; then pass "prediction_pool module published"; else fail "Module not found: $EXISTS"; fi

TOTAL_MARKETS=$(curl -s -X POST "$REST/initia/move/v1/view" \
  -H "Content-Type: application/json" \
  -d "{\"address\":\"$MODULE\",\"module_name\":\"prediction_pool\",\"function_name\":\"total_markets\",\"type_args\":[],\"args\":[]}" \
  --max-time 5 | sed -nE 's/.*"data":"\\"([0-9]+)\\"".*/\1/p' | head -1)
if [ -n "$TOTAL_MARKETS" ]; then pass "total_markets view fn works: $TOTAL_MARKETS markets"; else fail "total_markets view fn failed"; fi

TOTAL_VOLUME=$(curl -s -X POST "$REST/initia/move/v1/view" \
  -H "Content-Type: application/json" \
  -d "{\"address\":\"$MODULE\",\"module_name\":\"prediction_pool\",\"function_name\":\"total_volume\",\"type_args\":[],\"args\":[]}" \
  --max-time 5 | sed -nE 's/.*"data":"\\"([0-9]+)\\"".*/\1/p' | head -1)
if [ -n "$TOTAL_VOLUME" ]; then pass "total_volume view fn works: $TOTAL_VOLUME base-units"; else fail "total_volume view fn failed"; fi

VAULT_ADDR=$(curl -s -X POST "$REST/initia/move/v1/view" \
  -H "Content-Type: application/json" \
  -d "{\"address\":\"$MODULE\",\"module_name\":\"prediction_pool\",\"function_name\":\"vault_address\",\"type_args\":[],\"args\":[]}" \
  --max-time 5 | head -c 200)
info "vault_address view fn returns: $VAULT_ADDR"

echo ""
echo "=== 5. Other Ori modules still live ==="
for mod in payment_router tip_jar paywall wager_escrow profile_registry subscription_vault; do
  OK=$(curl -s "$REST/initia/move/v1/accounts/$MODULE/modules/$mod" --max-time 3 | head -c 30)
  if echo "$OK" | grep -q "module"; then pass "$mod module live"; else fail "$mod missing"; fi
done

echo ""
echo "=== 6. API server health ==="
APISTATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API/health" --max-time 3)
if [ "$APISTATUS" = "200" ]; then
  pass "API /health 200"
else
  info "API not running (status=$APISTATUS) — skipping API endpoint tests"
  echo "      Start with: pnpm --filter @ori/api dev"
  exit 0
fi

READY=$(curl -s "$API/health/ready" --max-time 3)
info "API /health/ready: $READY"

echo ""
echo "=== 7. Oracle proxy (via API) ==="
for pair in INIT/USD BTC/USD ETH/USD; do
  PRES=$(curl -s "$API/v1/oracle/price?pair=$pair" --max-time 5)
  PRICE=$(echo "$PRES" | sed -nE 's/.*"price":"([0-9]+)".*/\1/p')
  DEC=$(echo "$PRES" | sed -nE 's/.*"decimals":([0-9]+).*/\1/p')
  if [ -n "$PRICE" ]; then pass "Proxy $pair = $PRICE, decimals=$DEC"; else fail "Proxy $pair failed: ${PRES:0:200}"; fi
done

TICKERS=$(curl -s "$API/v1/oracle/tickers" --max-time 5 | head -c 200)
info "Tickers endpoint: $TICKERS"

echo ""
echo "=== 8. Weekly stats endpoint (requires seeded address) ==="
# Use gas-station address (we know it exists from deploy)
TEST_ADDR="init1qhwsccy884xexevd29z06ps4hnay8ff6szgkt2"
WSTATS=$(curl -s "$API/v1/profiles/$TEST_ADDR/weekly-stats" --max-time 5)
echo "      $WSTATS" | head -c 500
echo ""

echo ""
echo "=== 9. Activity feed ==="
AFEED=$(curl -s "$API/v1/profiles/$TEST_ADDR/activity?limit=3" --max-time 5)
if echo "$AFEED" | grep -q "entries"; then pass "Activity feed responds"; else fail "Activity feed failed"; fi

echo ""
echo "=== 10. Leaderboards ==="
for path in top-creators top-tippers global-stats; do
  LB=$(curl -s "$API/v1/leaderboards/$path?limit=3" --max-time 5)
  if echo "$LB" | grep -qE "entries|total"; then pass "Leaderboard /$path responds"; else fail "Leaderboard /$path failed: ${LB:0:100}"; fi
done

echo ""
echo "=== 11. MCP server build artifacts ==="
if [ -f "/mnt/c/Users/prate/Downloads/Initia builder/ori/apps/mcp-server/dist/index.js" ]; then
  pass "MCP dist/index.js exists"
  TOOLS=$(grep -c "name: 'ori\." "/mnt/c/Users/prate/Downloads/Initia builder/ori/apps/mcp-server/dist/index.js")
  pass "MCP tool count in dist: $TOOLS"
else
  fail "MCP dist missing - run: pnpm --filter @ori/mcp-server build"
fi

echo ""
echo "=== DONE ==="
