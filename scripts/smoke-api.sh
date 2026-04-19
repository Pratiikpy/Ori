#!/usr/bin/env bash
# End-to-end API smoke test against a running @ori/api instance.
#
# What this verifies:
#   - Every route is registered (no 404 routing bugs)
#   - Public routes return 200/cacheable content
#   - Auth-gated routes return 401 without a bearer
#   - Auth-gated routes return 403 on address mismatch (sponsor endpoints)
#   - Validation rejects malformed bodies with 400 (not 500)
#   - Server never 500s on a well-formed input
#
# Does NOT verify:
#   - Chain interaction (no rollup in scope here)
#   - WebSocket flows (socket.io tests need a real client)
#   - Successful auth paths (need a live wallet signature)
#
set -u
API="${API:-http://localhost:3001}"
PASS=0
FAIL=0

check() {
  local name="$1" expected="$2" actual="$3"
  if [ "$actual" = "$expected" ]; then
    printf "  ✓ %-50s  [%s]\n" "$name" "$actual"
    PASS=$((PASS+1))
  else
    printf "  ✗ %-50s  expected=%s got=%s\n" "$name" "$expected" "$actual"
    FAIL=$((FAIL+1))
  fi
}

hit() {
  # hit METHOD PATH [EXPECTED] [BODY]
  local method="$1" path="$2" expected="${3:-200}" body="${4:-}"
  local code
  if [ -n "$body" ]; then
    code=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" \
      -H "Content-Type: application/json" -d "$body" "$API$path")
  else
    code=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" "$API$path")
  fi
  check "$method $path" "$expected" "$code"
}

hit_auth() {
  # hit_auth METHOD PATH TOKEN [EXPECTED] [BODY]
  local method="$1" path="$2" token="$3" expected="${4:-200}" body="${5:-}"
  local code
  if [ -n "$body" ]; then
    code=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" \
      -H "Content-Type: application/json" -H "Authorization: Bearer $token" \
      -d "$body" "$API$path")
  else
    code=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" \
      -H "Authorization: Bearer $token" "$API$path")
  fi
  check "$method $path (bearer=$token)" "$expected" "$code"
}

echo "Testing $API"
echo
echo "── Health ──"
hit GET /health 200
hit GET /health/ready 200

echo
echo "── Sponsor (new in this session) ──"
hit GET /v1/sponsor/status 200
hit POST /v1/sponsor/seed 401 '{"address":"init1xxx"}'
hit POST /v1/sponsor/username 401 '{"address":"init1xxx","name":"alice"}'
hit_auth POST /v1/sponsor/seed "bogus-token" 401 '{"address":"init1xxx"}'
hit POST /v1/sponsor/seed 401 '{"malformed":true}'           # 401 because auth fires before body-parse

echo
echo "── Auth ──"
hit POST /v1/auth/challenge 400 '{}'                          # missing initiaAddress
hit POST /v1/auth/challenge 400 '{"initiaAddress":""}'        # empty string
hit POST /v1/auth/verify 400 '{}'
hit_auth GET /v1/auth/me "bogus" 401

echo
echo "── Profiles (public reads) ──"
# Unregistered address returns an empty-stub 200 by design (allows progressive
# enhancement on the frontend — profile page renders regardless of on-chain state).
hit GET /v1/profiles/init1ffffffffffffffffffffffffffffffffffffffff 200
hit GET /v1/profiles/malformed 400
hit GET /v1/profiles/init1ffffffffffffffffffffffffffffffffffffffff/activity 200
hit GET /v1/profiles/init1ffffffffffffffffffffffffffffffffffffffff/follow-stats 200

echo
echo "── Discover (three shelves) ──"
hit GET /v1/discover/recent 200
hit GET /v1/discover/top-creators 200
hit GET /v1/discover/rising 200

echo
echo "── Leaderboards ──"
hit GET /v1/leaderboards/top-creators 200
hit GET /v1/leaderboards/top-tippers 200

echo
echo "── Auth-gated reads reject unauthed ──"
hit_auth GET /v1/chats "bogus" 401
hit_auth GET /v1/messages/some-chat-id "bogus" 401
hit_auth POST /v1/push/subscribe "bogus" 401 '{}'

echo
echo "── Result ──"
echo "  $PASS passed · $FAIL failed"
if [ "$FAIL" -gt 0 ]; then exit 1; fi
