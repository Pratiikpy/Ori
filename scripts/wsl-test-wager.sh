#!/usr/bin/env bash
set -e
export PATH="$HOME/bin:$HOME/.local/bin:$PATH"
export LD_LIBRARY_PATH="$HOME/bin:${LD_LIBRARY_PATH:-}"
cd "/mnt/c/Users/prate/Downloads/Initia builder/ori/packages/contracts"
minitiad move test \
  --language-version=2.1 \
  --named-addresses ori=0x05dd0c60873d4d93658d5144fd0615bcfa43a53a \
  --filter wager_escrow \
  2>&1 | tail -60
