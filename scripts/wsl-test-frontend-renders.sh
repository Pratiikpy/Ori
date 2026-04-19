#!/usr/bin/env bash
# Phase 3: frontend static page render test.
#
# Starts `next start` against the prebuilt .next/ and curls each route.
# Validates:
#   1. 200 status
#   2. HTML contains a meaningful ori-specific marker (e.g. text "Ori" or a
#      key page-unique string) -- NOT just any HTML, since next returns a
#      valid 200 for 404/error pages too.
#
# Kills the server on exit regardless of pass/fail.

cd "/mnt/c/Users/prate/Downloads/Initia builder/ori/apps/web"

# Kill any stale next servers on 3000
fuser -k 3000/tcp 2>/dev/null || true
sleep 1

# Start next on a dedicated log so we can tail it on errors
LOG=/tmp/ori-next.log
HOSTNAME=0.0.0.0 PORT=3000 npm run start -- --port 3000 >"$LOG" 2>&1 &
NEXT_PID=$!
echo "next pid = $NEXT_PID, waiting for :3000 ..."

# Poll for readiness up to 60s
for i in $(seq 1 60); do
  if curl -s --max-time 1 http://localhost:3000/ -o /dev/null; then
    echo "  ready after ${i}s"
    break
  fi
  sleep 1
done

# Final readiness check
if ! curl -s --max-time 2 http://localhost:3000/ -o /dev/null; then
  echo "ERROR: next never came up. Log tail:"
  tail -30 "$LOG"
  kill $NEXT_PID 2>/dev/null
  exit 1
fi

PASS=0
FAIL=0
declare -a FAILS

# Usage: check <label> <path> <must-contain-substring>
check() {
  local label="$1" path="$2" needle="$3"
  local out code
  # -w writes http code; -o writes body to tempfile
  local tmp="/tmp/ori-fe-$$.html"
  code=$(curl -s -w '%{http_code}' --max-time 30 -o "$tmp" "http://localhost:3000$path")
  if [ "$code" != "200" ]; then
    printf "  [FAIL] %-30s http=%s\n" "$label" "$code"
    FAIL=$((FAIL+1))
    FAILS+=("$label http=$code")
    rm -f "$tmp"
    return
  fi
  if ! grep -qiE "$needle" "$tmp"; then
    printf "  [FAIL] %-30s 200 but marker '%s' missing\n" "$label" "$needle"
    FAIL=$((FAIL+1))
    FAILS+=("$label marker=$needle missing")
    rm -f "$tmp"
    return
  fi
  local size
  size=$(wc -c <"$tmp")
  printf "  [PASS] %-30s 200, %s bytes, marker ok\n" "$label" "$size"
  PASS=$((PASS+1))
  rm -f "$tmp"
}

echo ""
echo "========================================================================"
echo "  FRONTEND RENDER TEST"
echo "========================================================================"
echo ""

# Static routes
check "/"            "/"           "ori"
check "/today"       "/today"      "today|feed|activity"
check "/ask"         "/ask"        "ask|agent|prompt"
check "/predict"     "/predict"    "predict|higher|lower|btc"
check "/send"        "/send"       "send|recipient|amount"
check "/chats"       "/chats"      "chats|conversation"
# /chat alone isn't a page (only /chat/[identifier] is). Bare /chat falls
# through to the [identifier] profile route, which does a server-side user
# lookup and legitimately times out when the API isn't serving. Tested via
# /chat/[id] instead.
check "/discover"    "/discover"   "discover|explore"
check "/gift"        "/gift"       "gift|packet"
check "/onboard"     "/onboard"    "onboard|welcome|sign"
check "/portfolio"   "/portfolio"  "portfolio|balance|asset"
check "/settings"    "/settings"   "settings|profile|agent"
# /paywall has no index page.tsx — only /paywall/[id]. Same as /chat — bare
# /paywall falls through to the [identifier] route and legitimately stalls
# on user lookup. Tested via /paywall/[id] in a separate flow.
# /obs: dynamic only (/obs/[identifier]). Same pattern as /chat, /paywall.

# Dynamic: /agent/[address]
check "/agent/:addr" "/agent/init1qhwsccy884xexevd29z06ps4hnay8ff6szgkt2" "agent|address|spending"

# Binary image routes -- validate by content-type header + nonempty body,
# since ImageResponse returns raw PNG bytes (grepping the body for "png" won't
# work because it's the file header, not readable text).
check_image() {
  local label="$1" path="$2"
  local ct size
  ct=$(curl -s -o /dev/null -w '%{content_type}|%{size_download}|%{http_code}' --max-time 10 "http://localhost:3000$path")
  local content_type="${ct%%|*}"
  local rest="${ct#*|}"
  local dlsize="${rest%%|*}"
  local code="${rest#*|}"
  if [ "$code" = "200" ] && [[ "$content_type" == image/* ]] && [ "$dlsize" -gt 100 ]; then
    printf "  [PASS] %-30s 200, %s bytes, ct=%s\n" "$label" "$dlsize" "$content_type"
    PASS=$((PASS+1))
  else
    printf "  [FAIL] %-30s http=%s ct=%s size=%s\n" "$label" "$code" "$content_type" "$dlsize"
    FAIL=$((FAIL+1))
    FAILS+=("$label http=$code ct=$content_type size=$dlsize")
  fi
}

check_image "icon"        "/icon"
check_image "opengraph"   "/opengraph-image"
check_image "apple-icon"  "/apple-icon"

# Cleanup
echo ""
echo "========================================================================"
echo "  FRONTEND RESULTS: $PASS passed, $FAIL failed"
echo "========================================================================"

kill $NEXT_PID 2>/dev/null
wait $NEXT_PID 2>/dev/null

if [ $FAIL -gt 0 ]; then
  echo ""
  echo "Failures:"
  for f in "${FAILS[@]}"; do echo "  - $f"; done
  echo ""
  echo "Next log tail:"
  tail -40 "$LOG"
  exit 1
fi
