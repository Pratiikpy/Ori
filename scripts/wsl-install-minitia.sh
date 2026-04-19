#!/usr/bin/env bash
# Install minitiad + initiad into ~/bin (no sudo).
set -euo pipefail

mkdir -p "$HOME/bin"
export PATH="$HOME/bin:$PATH"

MINI_VER="v1.1.11"
INIT_VER="v1.4.5"

cd /tmp
if ! command -v minitiad >/dev/null || [ ! -f "$HOME/bin/libmovevm.x86_64.so" ]; then
  echo "[install] minitiad $MINI_VER"
  curl -fsSL "https://github.com/initia-labs/minimove/releases/download/${MINI_VER}/minimove_${MINI_VER}_Linux_x86_64.tar.gz" -o minimove.tgz
  rm -rf minimove-extract && mkdir minimove-extract
  tar -xzf minimove.tgz -C minimove-extract
  find minimove-extract -name "minitiad" -exec cp {} "$HOME/bin/minitiad" \;
  # Move VM shared libs must live next to the binary OR on LD_LIBRARY_PATH.
  find minimove-extract -name "*.so" -exec cp {} "$HOME/bin/" \;
  chmod +x "$HOME/bin/minitiad"
  # Ensure the libs resolve from ~/bin at runtime.
  if ! grep -q 'LD_LIBRARY_PATH.*/bin' "$HOME/.bashrc" 2>/dev/null; then
    echo 'export LD_LIBRARY_PATH=$HOME/bin:${LD_LIBRARY_PATH:-}' >> "$HOME/.bashrc"
  fi
fi
export LD_LIBRARY_PATH="$HOME/bin:${LD_LIBRARY_PATH:-}"

if ! command -v initiad >/dev/null; then
  echo "[install] initiad $INIT_VER"
  curl -fsSL "https://github.com/initia-labs/initia/releases/download/${INIT_VER}/initia_${INIT_VER}_Linux_x86_64.tar.gz" -o initia.tgz
  rm -rf initia-extract && mkdir initia-extract
  tar -xzf initia.tgz -C initia-extract
  find initia-extract -name "initiad" -exec cp {} "$HOME/bin/initiad" \;
  chmod +x "$HOME/bin/initiad"
fi

"$HOME/bin/minitiad" version 2>&1 | head -3
"$HOME/bin/initiad" version 2>&1 | head -3
echo "[done]"
