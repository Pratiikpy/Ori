#!/usr/bin/env bash
export PATH="$HOME/bin:$HOME/.local/bin:$PATH"
export LD_LIBRARY_PATH="$HOME/bin:${LD_LIBRARY_PATH:-}"

echo "--- Starting minitiad + opinit executor via systemd --user:"
systemctl --user daemon-reload
systemctl --user start minitiad 2>&1 || echo "(failed to start minitiad)"
systemctl --user start opinitd.executor.service 2>&1 || echo "(failed to start opinitd)"

echo "--- Unit status:"
systemctl --user is-active minitiad
systemctl --user is-active opinitd.executor.service

echo "--- Waiting 10s for boot..."
sleep 10

echo "--- RPC health check:"
curl -s -o /dev/null -w "rest=%{http_code}\n" http://localhost:1317/cosmos/base/tendermint/v1beta1/blocks/latest
curl -s -o /dev/null -w "rpc=%{http_code}\n" http://localhost:26657/status

echo "--- Latest block:"
curl -s http://localhost:1317/cosmos/base/tendermint/v1beta1/blocks/latest 2>&1 | head -c 500
echo
