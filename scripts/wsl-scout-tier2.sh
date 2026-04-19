#!/usr/bin/env bash
export PATH="$HOME/bin:$HOME/.local/bin:$PATH"
export LD_LIBRARY_PATH="$HOME/bin"
ORI="0x05dd0c60873d4d93658d5144fd0615bcfa43a53a"
for m in subscription_vault payment_stream squads lucky_pool merchant_registry gift_box_catalog gift_group; do
  echo "=== $m ==="
  curl -s "http://localhost:1317/initia/move/v1/accounts/$ORI/modules/$m" --max-time 5 \
    | python3 -c "
import json, sys
try:
    d = json.load(sys.stdin)
    abi = json.loads(d['module']['abi'])
    for f in abi.get('exposed_functions', []):
        if f.get('is_entry', False):
            params = ','.join(f.get('params', []))
            ret = ','.join(f.get('return', []))
            print(f\"{f.get('name','?')}({params}) -> {ret}\")
except Exception as e:
    print('err:', e)
"
  echo
done
