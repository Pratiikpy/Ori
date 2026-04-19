#!/usr/bin/env bash
curl -s "http://localhost:1317/cosmos/tx/v1beta1/txs/A64EFA7417295B496E9E9B52FA61A235B967B1E6F690069CB06F95143A291E2D" --max-time 5 \
  | python3 - "StreamOpened" "id" <<'PY'
import json, sys
try:
    event_frag, key = sys.argv[1], sys.argv[2]
    d = json.load(sys.stdin)
    for e in d.get('tx_response', {}).get('events', []):
        type_tag_match = False
        if e.get('type', '') == 'move':
            for a in e.get('attributes', []):
                if a.get('key') == 'type_tag' and event_frag in a.get('value', ''):
                    type_tag_match = True
                    break
        elif event_frag in e.get('type', ''):
            type_tag_match = True
        if not type_tag_match:
            continue
        data_json = None
        for a in e.get('attributes', []):
            if a.get('key') == 'data':
                try:
                    data_json = json.loads(a.get('value', ''))
                except Exception as ex:
                    print('DATA parse err:', ex, file=sys.stderr)
                break
        if data_json and key in data_json:
            v = str(data_json[key])
            print('FOUND via data:', v.strip('"'))
            sys.exit(0)
        for a in e.get('attributes', []):
            if a.get('key') == key:
                v = a.get('value', '').strip('"')
                print('FOUND via attr:', v)
                sys.exit(0)
    print('NOT FOUND')
except Exception as ex:
    print('EXCEPTION:', ex)
PY
