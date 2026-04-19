#!/usr/bin/env bash
# Install Go + Weave + initiad in the current user's home — no sudo required.
# Run: wsl -d Ubuntu-22.04 -- bash scripts/wsl-install-initia.sh
set -euo pipefail

mkdir -p "$HOME/bin"
export PATH="$HOME/go-install/go/bin:$HOME/bin:$PATH"

if ! command -v go >/dev/null; then
  echo "[install] Go 1.22.10"
  curl -fsSL https://go.dev/dl/go1.22.10.linux-amd64.tar.gz -o /tmp/go.tgz
  mkdir -p "$HOME/go-install"
  rm -rf "$HOME/go-install/go"
  tar -xzf /tmp/go.tgz -C "$HOME/go-install"
  if ! grep -q 'go-install/go/bin' "$HOME/.bashrc" 2>/dev/null; then
    echo 'export PATH=$HOME/go-install/go/bin:$HOME/bin:$PATH' >> "$HOME/.bashrc"
  fi
fi

if ! command -v weave >/dev/null; then
  echo "[install] weave"
  # Resolve the latest linux-amd64 release dynamically — asset names include the version.
  WEAVE_URL=$(curl -fsSL https://api.github.com/repos/initia-labs/weave/releases/latest \
    | grep -oE 'https://[^"]+weave-[0-9.]+-linux-amd64.tar.gz' | head -1)
  if [ -z "$WEAVE_URL" ]; then
    echo "[error] could not find weave linux-amd64 release URL"
    exit 1
  fi
  echo "[install] downloading $WEAVE_URL"
  curl -fsSL "$WEAVE_URL" -o /tmp/weave.tgz
  tar -xzf /tmp/weave.tgz -C "$HOME/bin"
fi

command -v go && go version
command -v weave && weave version 2>/dev/null || weave --help 2>/dev/null | head -1 || echo "[warn] weave installed but version unknown"
echo "[done] add this to your shell: export PATH=\$HOME/go-install/go/bin:\$HOME/bin:\$PATH"
