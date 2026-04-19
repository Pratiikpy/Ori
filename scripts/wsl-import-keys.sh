#!/usr/bin/env bash
# Import gas-station mnemonic from weave config into minitiad + initiad keyrings.
# Run after `weave init` has written ~/.weave/config.json.
#
# Idempotent: deletes any existing gas-station key first, then re-imports.
# Uses process substitution to feed the mnemonic exactly once — no `yes y |`
# that swallows stdin, no interactive prompts.
set -euo pipefail

export PATH="$HOME/bin:$HOME/go-install/go/bin:$PATH"
export LD_LIBRARY_PATH="$HOME/bin"

WEAVE_CONF="$HOME/.weave/config.json"
test -f "$WEAVE_CONF" || { echo "ERROR: $WEAVE_CONF missing — run weave init first"; exit 1; }

MNEMONIC=$(jq -r '.common.gas_station.mnemonic' "$WEAVE_CONF")
test -n "$MNEMONIC" -a "$MNEMONIC" != "null" || { echo "ERROR: gas_station.mnemonic empty"; exit 1; }

for BIN in minitiad initiad; do
  # Wipe any stale key quietly.
  "$BIN" keys delete gas-station --keyring-backend test -y >/dev/null 2>&1 || true
  # Recover from mnemonic. --coin-type 60 = Ethereum BIP44 path that Initia
  # uses for ethsecp256k1 keys. Default key-type is eth_secp256k1 already,
  # so we omit the flag to avoid shell-quoting edge cases.
  printf '%s\n' "$MNEMONIC" | "$BIN" keys add gas-station \
    --recover --keyring-backend test --coin-type 60
  ADDR=$("$BIN" keys show gas-station -a --keyring-backend test)
  echo "$BIN gas-station: $ADDR"
done
