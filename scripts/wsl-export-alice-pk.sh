#!/usr/bin/env bash
# Export alice-test private key from minitiad keyring (test backend, no
# password). Output is a 32-byte hex string suitable for MetaMask import.
set -uo pipefail
export PATH="$HOME/bin:$HOME/.local/bin:/usr/local/bin:/usr/bin:/bin"
export LD_LIBRARY_PATH="$HOME/bin:${LD_LIBRARY_PATH:-}"

# Two formats: --unarmored-hex --unsafe is the unencrypted hex
echo y | minitiad keys export alice-test --unarmored-hex --unsafe \
  --keyring-backend test 2>&1 | tail -1
