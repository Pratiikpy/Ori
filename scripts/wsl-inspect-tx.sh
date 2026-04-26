#!/usr/bin/env bash
set -uo pipefail
export PATH="$HOME/bin:$HOME/.local/bin:/usr/local/bin:/usr/bin:/bin"
export LD_LIBRARY_PATH="$HOME/bin:${LD_LIBRARY_PATH:-}"

NODE="http://localhost:26657"
HASH="${1:-79F40FC9F3CC2EE5F50F0A1C0C9D8FBBDFBDA0F2E0B5B5FE1D4D2C9DBE00B11A}"

RAW=$(minitiad q tx "$HASH" --node "$NODE" --output json 2>&1)
echo "---RAW LEN---"
echo "${#RAW}"
echo "---FIRST 500---"
echo "$RAW" | head -c 500
echo ""
echo "---PARSE---"
echo "$RAW" | python3 -c "
import sys, json
try:
  d = json.loads(sys.stdin.read())
except Exception as e:
  print('parse fail:', e); sys.exit(1)
print('height:', d.get('height'))
print('code:', d.get('code'))
for e in d.get('events', []):
  t = e.get('type','')
  if 'move' in t or 'paywall' in t.lower() or 'gift' in t.lower() or 'wager' in t.lower() or 'lucky' in t.lower() or 'squad' in t.lower() or 'subscription' in t.lower() or 'created' in t.lower():
    print('--', t)
    for a in e.get('attributes',[]):
      k = a.get('key',''); v = a.get('value','')
      print('   ', k, '=', v)
"
