#!/usr/bin/env bash
export PATH="$HOME/bin:$HOME/.local/bin:$PATH"
export LD_LIBRARY_PATH="$HOME/bin"
OUT=$(minitiad tx move execute 0x05dd0c60873d4d93658d5144fd0615bcfa43a53a payment_stream open_stream \
  --args '["address:init1m57yx20zrq27r0zk28utrkctp9kdkp7s337sm4","u64:60000","u64:60","string:umin"]' \
  --from gas-station --keyring-backend test --chain-id ori-1 --node http://localhost:26657 \
  --gas auto --gas-adjustment 1.8 --gas-prices 0.15umin --output json -y 2>&1)
TX=$(echo "$OUT" | grep -oE '"txhash":"[A-F0-9]+"' | head -1 | cut -d'"' -f4)
echo "TX: $TX"
sleep 8
echo "--- events dump ---"
curl -s "http://localhost:1317/cosmos/tx/v1beta1/txs/$TX" --max-time 5 \
  | python3 -c "
import json, sys
d = json.load(sys.stdin)
evs = d.get('tx_response', {}).get('events', [])
for e in evs:
    t = e.get('type', '')
    if 'Stream' in t or 'move' in t.lower():
        print('TYPE:', t)
        for a in e.get('attributes', []):
            k = a.get('key','')
            v = a.get('value','')[:80]
            print(f'  {k} = {v}')
        print()
"
