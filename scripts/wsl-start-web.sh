#!/usr/bin/env bash
fuser -k 3000/tcp 2>/dev/null || true
sleep 1
cd "/mnt/c/Users/prate/Downloads/Initia builder/ori/apps/web"
HOSTNAME=0.0.0.0 PORT=3000 nohup npm run start > /tmp/ori-next.log 2>&1 &
echo "pid=$!"
for i in $(seq 1 45); do
  if curl -s --max-time 1 http://localhost:3000/ -o /dev/null; then
    echo "ready in ${i}s"; break
  fi
  sleep 1
done
