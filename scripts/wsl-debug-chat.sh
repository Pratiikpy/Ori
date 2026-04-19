#!/usr/bin/env bash
fuser -k 3000/tcp 2>/dev/null || true
sleep 1
cd "/mnt/c/Users/prate/Downloads/Initia builder/ori/apps/web"
HOSTNAME=0.0.0.0 PORT=3000 npm run start > /tmp/ori-next.log 2>&1 &
NEXT_PID=$!
for i in $(seq 1 30); do
  if curl -s --max-time 1 http://localhost:3000/ -o /dev/null; then
    echo "ready in ${i}s"
    break
  fi
  sleep 1
done

echo "--- GET /chat:"
curl -s -o /dev/null -w "code=%{http_code} time=%{time_total}s size=%{size_download}\n" --max-time 8 http://localhost:3000/chat
echo "--- GET /chat/alice.init:"
curl -s -o /dev/null -w "code=%{http_code} time=%{time_total}s size=%{size_download}\n" --max-time 8 http://localhost:3000/chat/alice.init
echo "--- GET /chats:"
curl -s -o /dev/null -w "code=%{http_code} time=%{time_total}s size=%{size_download}\n" --max-time 8 http://localhost:3000/chats
echo "--- /chat (again, to rule out one-off):"
curl -s -o /dev/null -w "code=%{http_code} time=%{time_total}s size=%{size_download}\n" --max-time 8 http://localhost:3000/chat

kill $NEXT_PID 2>/dev/null || true
