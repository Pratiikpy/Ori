#!/usr/bin/env bash
export PATH="$HOME/bin:$HOME/.local/bin:$PATH"
export LD_LIBRARY_PATH="$HOME/bin"

OUT=$(minitiad tx move execute 0x05dd0c60873d4d93658d5144fd0615bcfa43a53a paywall create_paywall \
  --args '["string:Probe","string:ipfs://probe","u64:10000","string:umin"]' \
  --from gas-station --keyring-backend test --chain-id ori-1 --node http://localhost:26657 \
  --gas auto --gas-adjustment 1.5 --gas-prices 0.15umin --output json -y 2>&1)
TX=$(echo "$OUT" | grep -oE '"txhash":"[A-F0-9]+"' | head -1 | sed 's/"txhash":"//;s/"$//')
echo "tx hash: $TX"
sleep 5
echo ""
echo "=== Full tx response (trimmed) ==="
curl -s "http://localhost:1317/cosmos/tx/v1beta1/txs/$TX" --max-time 5 > /tmp/tx.json
python3 -c "
import json
d = json.load(open('/tmp/tx.json'))
events = d.get('tx_response', {}).get('events', [])
for e in events:
    t = e.get('type', '')
    if 'PaywallCreated' in t or 'move' in t:
        print('TYPE:', t)
        for a in e.get('attributes', []):
            print(' ', a.get('key',''), '=', a.get('value','')[:80])
        print()
" 2>&1 | head -60
