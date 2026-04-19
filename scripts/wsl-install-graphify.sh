#!/usr/bin/env bash
# Install graphify inside WSL via pipx (isolated from system Python).
set -e
export PATH="$HOME/.local/bin:/usr/local/bin:/usr/bin:/bin"

pipx install graphifyy 2>&1 | tail -15
echo "---"
which graphify || echo "graphify not on PATH"
graphify --version 2>&1 | head -3 || true
