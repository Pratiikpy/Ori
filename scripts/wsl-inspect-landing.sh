#!/usr/bin/env bash
# Inspect the rendered landing HTML in-process. Starts next, curls /, writes
# to a tempfile, greps for markers, then tears down.
fuser -k 3000/tcp 2>/dev/null || true
sleep 1
cd "/mnt/c/Users/prate/Downloads/Initia builder/ori/apps/web"
HOSTNAME=0.0.0.0 PORT=3000 npm run start > /tmp/ori-next.log 2>&1 &
NEXT_PID=$!

for i in $(seq 1 45); do
  if curl -s --max-time 1 http://localhost:3000/ -o /dev/null; then break; fi
  sleep 1
done

HTML=/tmp/ori-landing-rendered.html
curl -s --max-time 10 http://localhost:3000/ > "$HTML"
echo "bytes=$(wc -c < "$HTML")"

echo
echo "--- headline + section markers (each should be > 0):"
for marker in "Messages that" "move money" "Open Ori" "six primitives" "Daily" "Predict in a sentence" "Connect oracle" "A2A JSON-RPC" "font-serif" "restraint"; do
  c=$(grep -c "$marker" "$HTML")
  printf "  %-28s %s\n" "$marker" "$c"
done

echo
echo "--- emojis (each should be 0):"
for e in "🫡" "🎬" "📸" "🔓" "☕" "⚡" "✨" "🚀"; do
  c=$(grep -c "$e" "$HTML" 2>/dev/null)
  printf "  %-4s %s\n" "$e" "$c"
done

echo
echo "--- banned phrases (should be 0):"
for p in "hackathon" "Season 1" "INITIATE" "built for"; do
  c=$(grep -ci "$p" "$HTML")
  printf "  %-16s %s\n" "$p" "$c"
done

kill $NEXT_PID 2>/dev/null
wait $NEXT_PID 2>/dev/null
