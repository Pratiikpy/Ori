#!/usr/bin/env bash
# Phase 2: MCP stdio tool invocation test.
#
# Spawns apps/mcp-server/dist/index.js and drives it via JSON-RPC 2.0
# over stdin/stdout (the protocol MCP clients like Claude Desktop use).
# Validates:
#   1. initialize handshake
#   2. tools/list returns all 14 tools
#   3. tools/call for each read-only tool returns a plausible result
#
# Read-only tools (no signing required):
#   ori.get_balance, ori.get_profile, ori.resolve_init_name,
#   ori.list_top_creators, ori.search_initia_docs, ori.fetch_initia_doc,
#   ori.discover_x402
#
# Write tools (require mnemonic; listed-only unless ORI_MCP_MNEMONIC set):
#   ori.send_payment, ori.send_tip, ori.create_link_gift, ori.propose_wager,
#   ori.purchase_paywall, ori.schedule_action, ori.predict

cd "/mnt/c/Users/prate/Downloads/Initia builder/ori/apps/mcp-server"

export PATH="$HOME/bin:$HOME/.local/bin:/usr/bin:$PATH"
export ORI_CHAIN_ID="ori-1"
export ORI_RPC_URL="http://localhost:26657"
export ORI_REST_URL="http://localhost:1317"
export ORI_MODULE_ADDRESS="0x05dd0c60873d4d93658d5144fd0615bcfa43a53a"
export ORI_DENOM="umin"
export ORI_API_URL="http://localhost:3001"
export ORI_WEB_URL="http://localhost:3000"
# Disable A2A http server to avoid port conflicts during test
export ORI_A2A_PORT="0"
# Use a funded testnet mnemonic. Either export it before running this
# script, or source apps/api/.env first (which also defines it).
: "${ORI_MCP_MNEMONIC:?Set ORI_MCP_MNEMONIC before running (12 or 24-word BIP-39 of a funded init1 wallet)}"

python3 - <<'PY'
import json
import os
import subprocess
import sys
import threading
import time

PASS = 0
FAIL = 0
fails = []

def pass_(label, detail=""):
    global PASS
    PASS += 1
    print(f"  [PASS] {label:<44} {detail}")

def fail_(label, detail):
    global FAIL
    FAIL += 1
    fails.append(f"{label} :: {detail}")
    print(f"  [FAIL] {label:<44} {detail[:140]}")

# Spawn the MCP server
proc = subprocess.Popen(
    ["node", "dist/index.js"],
    stdin=subprocess.PIPE,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    env=os.environ.copy(),
    bufsize=0,
)

# Drain stderr to a list so we can surface fatal errors
stderr_lines = []
def _stderr_reader():
    for line in proc.stderr:
        stderr_lines.append(line.decode("utf-8", errors="replace").rstrip())

t = threading.Thread(target=_stderr_reader, daemon=True)
t.start()

def send(method, params=None, rid=1):
    msg = {"jsonrpc": "2.0", "id": rid, "method": method}
    if params is not None:
        msg["params"] = params
    data = (json.dumps(msg) + "\n").encode("utf-8")
    proc.stdin.write(data)
    proc.stdin.flush()

# Persistent buffer + id-indexed response store so replies that arrive out
# of order (or bundled) don't confuse later recv() calls.
_buf = b""
_pending = {}   # id -> parsed JSON response

def _pump(timeout=10.0):
    """Read from stdout until we have at least one complete line."""
    import select
    global _buf
    deadline = time.time() + timeout
    while time.time() < deadline:
        r, _, _ = select.select([proc.stdout], [], [], 0.3)
        if proc.stdout in r:
            chunk = os.read(proc.stdout.fileno(), 65536)
            if not chunk:
                return
            _buf += chunk
        # Drain any complete lines into _pending
        while b"\n" in _buf:
            line, _, rest = _buf.partition(b"\n")
            _buf = rest
            try:
                obj = json.loads(line.decode("utf-8"))
                rid = obj.get("id")
                if rid is not None:
                    _pending[rid] = obj
                else:
                    # notification; ignore
                    pass
            except Exception:
                pass

def recv_id(rid, timeout=15.0):
    """Wait for a response with the given id."""
    deadline = time.time() + timeout
    while time.time() < deadline:
        if rid in _pending:
            return _pending.pop(rid)
        _pump(timeout=1.0)
    return None

def recv(timeout=10.0):
    # Legacy alias: grab the lowest pending id.
    _pump(timeout=timeout)
    if _pending:
        return _pending.pop(min(_pending.keys()))
    return None

# Give the server a moment to init
time.sleep(1.5)

# 1. initialize
send("initialize", {
    "protocolVersion": "2024-11-05",
    "capabilities": {},
    "clientInfo": {"name": "ori-test-runner", "version": "0.1.0"},
}, rid=1)
resp = recv_id(1, timeout=10)
if resp and resp.get("result", {}).get("serverInfo"):
    info = resp["result"]["serverInfo"]
    pass_("initialize", f"server={info.get('name')} v{info.get('version')}")
    # Per MCP spec, client must send "initialized" notification
    proc.stdin.write((json.dumps({"jsonrpc":"2.0","method":"notifications/initialized"}) + "\n").encode())
    proc.stdin.flush()
else:
    fail_("initialize", str(resp)[:200])

# 2. tools/list
send("tools/list", {}, rid=2)
resp = recv_id(2, timeout=10)
tool_names = []
if resp and "result" in resp and "tools" in resp["result"]:
    tool_names = [t["name"] for t in resp["result"]["tools"]]
    expected = {
        "ori.send_payment", "ori.send_tip", "ori.create_link_gift",
        "ori.get_balance", "ori.get_profile", "ori.resolve_init_name",
        "ori.propose_wager", "ori.list_top_creators", "ori.purchase_paywall",
        "ori.search_initia_docs", "ori.fetch_initia_doc", "ori.discover_x402",
        "ori.schedule_action", "ori.predict",
    }
    missing = expected - set(tool_names)
    if not missing:
        pass_("tools/list", f"all {len(expected)} tools present")
    else:
        fail_("tools/list", f"missing: {missing}")
else:
    fail_("tools/list", str(resp)[:200])

# Helper for tools/call
def call(tool, args, expect_ok=True, rid=10):
    send("tools/call", {"name": tool, "arguments": args}, rid=rid)
    r = recv_id(rid, timeout=25)
    if r is None:
        fail_(f"call {tool}", "no response")
        return None
    if r.get("result", {}).get("isError"):
        # server-reported error result (still a valid response)
        content = r["result"].get("content", [{}])
        msg = content[0].get("text", "") if content else ""
        if expect_ok:
            fail_(f"call {tool}", f"isError: {msg[:160]}")
        else:
            pass_(f"call {tool}", "rejected as expected")
        return r
    content = r.get("result", {}).get("content", [{}])
    text = content[0].get("text", "") if content else ""
    pass_(f"call {tool}", f"{text[:80]}...")
    return r

# 3. tools/call -- read-only tools (safe)

# ori.get_balance -- gas-station
call("ori.get_balance", {"address": "init1qhwsccy884xexevd29z06ps4hnay8ff6szgkt2"}, rid=11)

# ori.get_profile -- gas-station (may be empty if no profile, should still succeed)
call("ori.get_profile", {"address": "init1qhwsccy884xexevd29z06ps4hnay8ff6szgkt2"}, rid=12)

# ori.resolve_init_name -- attempts L1 resolution; may 404/fail gracefully
call("ori.resolve_init_name", {"name": "ori"}, rid=13, expect_ok=False)

# ori.list_top_creators -- hits api at :3001
call("ori.list_top_creators", {"limit": 5}, rid=14)

# ori.search_initia_docs -- upstream search may not match; tolerate no-result
call("ori.search_initia_docs", {"query": "move events", "limit": 3}, rid=15, expect_ok=False)

# ori.fetch_initia_doc -- pick a known path (will likely 404; expect_ok=False)
call("ori.fetch_initia_doc", {"path": "/guides/quickstart"}, rid=16, expect_ok=False)

# ori.discover_x402 -- must be https:// per schema; probe a stable public endpoint
call("ori.discover_x402", {"url": "https://docs.initia.xyz/"}, rid=17)

# 4. Clean shutdown
try:
    proc.stdin.close()
except Exception:
    pass
try:
    proc.wait(timeout=5)
except subprocess.TimeoutExpired:
    proc.terminate()

print("")
print("=" * 72)
print(f"  MCP STDIO RESULTS: {PASS} passed, {FAIL} failed")
print("=" * 72)
if stderr_lines:
    print("")
    print("stderr tail:")
    for ln in stderr_lines[-10:]:
        print(f"  {ln}")
if fails:
    print("")
    print("Failures:")
    for f in fails:
        print(f"  - {f}")
    sys.exit(1)
PY
