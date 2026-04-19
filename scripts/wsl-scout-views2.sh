#!/usr/bin/env bash
ORI="0x05dd0c60873d4d93658d5144fd0615bcfa43a53a"
for m in subscription_vault squads lucky_pool gift_box_catalog gift_group; do
  echo "=== $m view fns ==="
  curl -s "http://localhost:1317/initia/move/v1/accounts/$ORI/modules/$m" --max-time 5 | python3 -c "
import json, sys
d = json.load(sys.stdin)
abi = json.loads(d['module']['abi'])
for f in abi.get('exposed_functions', []):
    if f.get('is_view', False):
        print(' ', f.get('name','?'), '(', ','.join(f.get('params', [])), ') ->', ','.join(f.get('return', [])))
"
  echo
done
