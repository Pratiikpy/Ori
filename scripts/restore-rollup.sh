#!/usr/bin/env bash
# restore-rollup.sh — bring the Ori rollup back online + reattach Vercel.
#
# When the local rollup machine restarts (cloudflared tunnel URLs are
# ephemeral on the free trycloudflare.com plan), every URL pinned to the
# Vercel deploy goes stale and the deployed app's chain queries 502.
#
# This script:
#   1. Starts the systemd-user minitiad service (rollup) and verifies block
#      height is advancing.
#   2. Spins up two cloudflared tunnels — one for REST (1317), one for RPC
#      (26657) — and parses the assigned trycloudflare.com URLs from the
#      tunnel logs.
#   3. Pushes the new URLs into the Vercel project's production env vars
#      (NEXT_PUBLIC_RPC_URL, NEXT_PUBLIC_REST_URL, ORI_RPC_URL, ORI_REST_URL).
#   4. Triggers `vercel --prod --force` so the deploy picks up the new
#      values.
#   5. Polls /api/health/deep until chain.ok=true on the deployed app.
#   6. Runs scripts/verify-deployed.sh to confirm 21/21 checks pass.
#
# Prerequisites:
#   - WSL with minitiad installed at ~/bin/minitiad + .minitia state present
#   - cloudflared installed at ~/bin/cloudflared (script downloads if not)
#   - vercel CLI authenticated as the project owner
#
# Usage:
#   bash scripts/restore-rollup.sh
#
# Idempotent: safe to re-run after a fresh tunnel restart.

set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "Ori rollup restoration"
echo "======================"
echo

# ─── 1. Boot rollup ────────────────────────────────────────────────────
echo "[1/6] Starting minitiad..."
wsl bash -c 'systemctl --user daemon-reload 2>&1; systemctl --user start minitiad 2>&1; sleep 8; systemctl --user is-active minitiad' 2>&1 | tail -3

echo "[1/6] Verifying block height..."
H1=$(wsl bash -c 'curl -sS http://localhost:26657/status 2>/dev/null' \
  | grep -oE '"latest_block_height":"[0-9]+"' | grep -oE '[0-9]+' | head -1)
sleep 5
H2=$(wsl bash -c 'curl -sS http://localhost:26657/status 2>/dev/null' \
  | grep -oE '"latest_block_height":"[0-9]+"' | grep -oE '[0-9]+' | head -1)
echo "  height $H1 → $H2 (advancing: $([ "$H2" -gt "$H1" ] && echo yes || echo no))"

# ─── 2. Tunnels ────────────────────────────────────────────────────────
echo
echo "[2/6] Starting cloudflared tunnels..."
wsl bash -c 'pkill -f "cloudflared tunnel" 2>/dev/null; sleep 1' 2>&1 | head -1

wsl bash -c '~/bin/cloudflared tunnel --url http://localhost:1317 --no-autoupdate --logfile /tmp/cf-rest.log 2>/dev/null' &
disown
wsl bash -c '~/bin/cloudflared tunnel --url http://localhost:26657 --no-autoupdate --logfile /tmp/cf-rpc.log 2>/dev/null' &
disown
sleep 18

REST_URL=$(wsl bash -c 'cat /tmp/cf-rest.log 2>/dev/null' \
  | grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' | head -1)
RPC_URL=$(wsl bash -c 'cat /tmp/cf-rpc.log 2>/dev/null' \
  | grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' | head -1)

if [ -z "$REST_URL" ] || [ -z "$RPC_URL" ]; then
  echo "  [FAIL] could not parse tunnel URLs from logs"
  echo "         /tmp/cf-rest.log:"
  wsl bash -c 'tail -10 /tmp/cf-rest.log 2>/dev/null'
  echo "         /tmp/cf-rpc.log:"
  wsl bash -c 'tail -10 /tmp/cf-rpc.log 2>/dev/null'
  exit 1
fi
echo "  REST: $REST_URL"
echo "  RPC:  $RPC_URL"

# ─── 3. Push to Vercel ─────────────────────────────────────────────────
echo
echo "[3/6] Updating Vercel production env vars..."
cd "$REPO_ROOT"
for k in NEXT_PUBLIC_RPC_URL NEXT_PUBLIC_REST_URL ORI_RPC_URL ORI_REST_URL; do
  vercel env rm "$k" production --yes >/dev/null 2>&1
done
# printf — avoid trailing newlines that the API's Zod env validator rejects.
printf "%s" "$RPC_URL"  | vercel env add NEXT_PUBLIC_RPC_URL production >/dev/null 2>&1
printf "%s" "$REST_URL" | vercel env add NEXT_PUBLIC_REST_URL production >/dev/null 2>&1
printf "%s" "$RPC_URL"  | vercel env add ORI_RPC_URL production >/dev/null 2>&1
printf "%s" "$REST_URL" | vercel env add ORI_REST_URL production >/dev/null 2>&1
echo "  done"

# ─── 4. Redeploy ───────────────────────────────────────────────────────
echo
echo "[4/6] Triggering production redeploy..."
DEPLOY_OUT=$(vercel --prod --yes --force 2>&1 | tail -3)
echo "$DEPLOY_OUT"

# ─── 5. Wait for chain.ok ──────────────────────────────────────────────
echo
echo "[5/6] Polling /api/health/deep for chain.ok=true..."
for i in $(seq 1 30); do
  body=$(curl -sS -m 15 "https://ori-chi-rosy.vercel.app/api/health/deep" 2>/dev/null)
  if echo "$body" | grep -q '"chain":{"tip":[1-9][0-9]*'; then
    echo "  chain reachable from production after ${i}0s"
    break
  fi
  sleep 10
done

# ─── 6. Run verification ───────────────────────────────────────────────
echo
echo "[6/6] Running scripts/verify-deployed.sh..."
bash "$REPO_ROOT/scripts/verify-deployed.sh"
