#!/usr/bin/env bash
# Given a tx prefix, find the full hash via cometbft and inspect events.
PREFIX="${1:?usage: $0 <tx-hash-prefix>}"
export PATH="$HOME/bin:$HOME/.local/bin:$PATH"
export LD_LIBRARY_PATH="$HOME/bin"
# CometBFT RPC tx search
RES=$(curl -s "http://localhost:26657/tx_search?query=\"tx.hash='$PREFIX'\"" --max-time 5)
echo "$RES" | head -c 200
echo ""
# Also try REST with the prefix directly (must be full hash)
curl -s "http://localhost:1317/cosmos/tx/v1beta1/txs/$PREFIX" --max-time 5 > /tmp/tx.json
echo "--- /tmp/tx.json size:"
wc -c /tmp/tx.json
echo "--- head:"
head -c 400 /tmp/tx.json
echo ""
echo "--- events (PoolCreated/StreamOpened):"
python3 -c "
import json
d = json.load(open('/tmp/tx.json'))
for e in d.get('tx_response', {}).get('events', []):
    if e.get('type') == 'move':
        for a in e.get('attributes', []):
            if a.get('key') == 'type_tag':
                tt = a.get('value', '')
                if 'Pool' in tt or 'Stream' in tt:
                    print('type_tag:', tt)
                    for a2 in e.get('attributes', []):
                        print(' ', a2.get('key'), '=', a2.get('value', '')[:120])
                    print()
                    break
"
