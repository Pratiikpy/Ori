#!/usr/bin/env bash
export PATH="$HOME/bin:$HOME/.local/bin:$PATH"
export LD_LIBRARY_PATH="$HOME/bin:${LD_LIBRARY_PATH:-}"
cd "/mnt/c/Users/prate/Downloads/Initia builder/ori/packages/contracts"
minitiad move build \
  --language-version=2.1 \
  --named-addresses ori=0x05dd0c60873d4d93658d5144fd0615bcfa43a53a \
  > /tmp/buildout.log 2>&1
RC=$?
echo "EXIT=$RC"
echo "--- errors:"
grep -c "^error" /tmp/buildout.log || true
echo "--- warnings:"
grep -c "^warning" /tmp/buildout.log || true
echo "--- bytecode modules produced:"
ls build/ori/bytecode_modules/ 2>&1
