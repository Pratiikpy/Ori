#!/usr/bin/env bash
export PATH="$HOME/bin:$HOME/.local/bin:$PATH"
export LD_LIBRARY_PATH="$HOME/bin"
ORI="0x05dd0c60873d4d93658d5144fd0615bcfa43a53a"
for m in subscription_vault payment_stream squads lucky_pool gift_box_catalog gift_group; do
  echo "=== $m view fns ==="
  curl -s "http://localhost:1317/initia/move/v1/accounts/$ORI/modules/$m" --max-time 5 \
    | python3 - <<'PY'
import json, sys
d = json.load(sys.stdin)
abi = json.loads(d['module']['abi'])
for f in abi.get('exposed_functions', []):
    if f.get('is_view', False):
        name = f.get('name','?')
        params = ','.join(f.get('params', []))
        ret = ','.join(f.get('return', []))
        print(f"  {name}({params}) -> {ret}")
PY
  echo
done
