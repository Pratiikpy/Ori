#!/usr/bin/env bash
# Generate a fresh Ori deployer wallet in the test keyring.
# Writes the mnemonic to ~/.ori-deployer.mnemonic (chmod 600) so you can copy it.
set -euo pipefail
export PATH="$HOME/bin:$HOME/go-install/go/bin:$PATH"
export LD_LIBRARY_PATH="$HOME/bin:${LD_LIBRARY_PATH:-}"

KEY=ori-deployer

# Remove any prior key so the add always generates a fresh one.
initiad keys delete "$KEY" --keyring-backend test -y >/dev/null 2>&1 || true

echo "=== Generating fresh wallet: $KEY ==="
# `add` prints the mnemonic to stderr + the pubkey/address to stdout.
# We capture both with a temp file so we can also persist the mnemonic.
TMP=$(mktemp)
initiad keys add "$KEY" --keyring-backend test --output json 2>"$TMP" > /tmp/ori-key.json

cat /tmp/ori-key.json | head -20
echo
echo "=== MNEMONIC (save this somewhere safe) ==="
# The mnemonic is on the last non-empty line of stderr.
MNEM=$(grep -v '^$' "$TMP" | tail -1)
echo "$MNEM"
echo
echo "=== Derived addresses ==="
BECH32=$(initiad keys show "$KEY" -a --keyring-backend test)
HEX=0x$(initiad keys parse "$BECH32" --output json | jq -r '.bytes' | tr '[:upper:]' '[:lower:]')
echo "Bech32 (init1...): $BECH32"
echo "Hex   (0x...):     $HEX"

# Persist mnemonic + addresses for later deploy script.
umask 077
cat > "$HOME/.ori-deployer.env" <<ENV
ORI_DEPLOYER_MNEMONIC="$MNEM"
ORI_DEPLOYER_BECH32="$BECH32"
ORI_DEPLOYER_HEX="$HEX"
ENV
chmod 600 "$HOME/.ori-deployer.env"
echo
echo "Saved to ~/.ori-deployer.env (chmod 600)"
rm -f "$TMP"
