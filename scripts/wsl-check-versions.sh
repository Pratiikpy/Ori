#!/usr/bin/env bash
set -e
export PATH="$HOME/bin:$HOME/go-install/go/bin:$PATH"
export LD_LIBRARY_PATH="$HOME/bin"
echo "weave:    $(weave version 2>&1 | head -1)"
echo "minitiad: $(minitiad version 2>&1 | head -1)"
echo "initiad:  $(initiad version 2>&1 | head -1)"
echo "jq:       $(jq --version 2>&1)"
echo "go:       $(go version 2>&1)"
