#!/usr/bin/env bash
export PATH="$HOME/bin:$HOME/.local/bin:$PATH"
export LD_LIBRARY_PATH="$HOME/bin:${LD_LIBRARY_PATH:-}"
echo "--- systemd-user status:"
systemctl --user is-active minitiad 2>&1 || echo "(no systemd unit)"
echo "--- process check:"
pgrep -a minitiad | head -3 || echo "(no minitiad process)"
echo "--- RPC health:"
curl -s -o /dev/null -w "rest=%{http_code}\n" http://localhost:1317/cosmos/base/tendermint/v1beta1/blocks/latest || echo "(REST unreachable)"
curl -s -o /dev/null -w "rpc=%{http_code}\n" http://localhost:26657/status || echo "(RPC unreachable)"
echo "--- gas-station address + balance:"
minitiad keys show gas-station --keyring-backend test -a 2>&1 | head -3
ADDR=$(minitiad keys show gas-station --keyring-backend test -a 2>&1 | head -1)
if [ -n "$ADDR" ]; then
  minitiad query bank balances "$ADDR" --chain-id ori-1 --node http://localhost:26657 2>&1 | head -20
fi
