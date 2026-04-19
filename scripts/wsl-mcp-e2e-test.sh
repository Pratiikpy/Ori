#!/usr/bin/env bash
# End-to-end MCP test — runs inside WSL so `localhost` resolves to the
# rollup's actual process (Windows Firewall blocks WSL→Windows port
# forwarding on this machine). Proves the full killer-demo-moment chain:
# Alice checks balance → searches docs → buys paywall #1 → reads content.
set -euo pipefail

export PATH="$HOME/bin:$HOME/go-install/go/bin:/usr/local/bin:/usr/bin:/bin"
export LD_LIBRARY_PATH="$HOME/bin"

ROOT="/mnt/c/Users/prate/Downloads/Initia builder/ori"
cd "$ROOT"

# Alice's mnemonic from the seed wallets file.
ALICE_MNEMONIC=$(node -e "console.log(require('$ROOT/apps/api/.ori-seed-wallets.json').Alice)")

# Boot MCP server with A2A enabled on port 3030.
export ORI_A2A_PORT=3030
export ORI_MCP_STDIO=off
export ORI_CHAIN_ID=ori-1
export ORI_RPC_URL=http://127.0.0.1:26657
export ORI_REST_URL=http://127.0.0.1:1317
export ORI_MODULE_ADDRESS=0x05dd0c60873d4d93658d5144fd0615bcfa43a53a
export ORI_DENOM=umin
export ORI_WEB_URL=http://127.0.0.1:3000
export L1_REST_URL=https://rest.testnet.initia.xyz
export L1_CHAIN_ID=initiation-2
export ORI_MCP_MNEMONIC="$ALICE_MNEMONIC"

# Cleanup any lingering MCP from a prior run.
pkill -f "mcp-server/dist/index.js" 2>/dev/null || true
sleep 1

node apps/mcp-server/dist/index.js &
MCP_PID=$!
trap "kill $MCP_PID 2>/dev/null || true" EXIT
sleep 3

call() {
  local name="$1" args="$2"
  curl -s -X POST http://127.0.0.1:3030/a2a \
    -H "Content-Type: application/json" \
    -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{\"name\":\"$name\",\"arguments\":$args}}"
}

echo "===1-balance-before==="
call ori.get_balance '{"address":"init1t6y837g9n0lkmef2ls9sgw2s727skswna0xhkc"}' | python3 -c "import sys, json; d=json.load(sys.stdin); print(d['result']['content'][0]['text'] if 'result' in d else d)"

echo
echo "===2-search-docs==="
call ori.search_initia_docs '{"query":"paywall","limit":3}' | python3 -c "import sys, json; d=json.load(sys.stdin); print((d['result']['content'][0]['text'] if 'result' in d else str(d))[:400])"

echo
echo "===3-purchase-paywall-1==="
call ori.purchase_paywall '{"paywall_id":"1"}' | python3 -c "import sys, json; d=json.load(sys.stdin); txt = (d.get('result',{}).get('content',[{}])[0].get('text','') if 'result' in d else json.dumps(d.get('error',d), indent=2)); print(txt[:3500])"

echo
echo "===4-balance-after==="
call ori.get_balance '{"address":"init1t6y837g9n0lkmef2ls9sgw2s727skswna0xhkc"}' | python3 -c "import sys, json; d=json.load(sys.stdin); print(d['result']['content'][0]['text'] if 'result' in d else d)"

echo
echo "===done==="
