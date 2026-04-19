# Ori Runbook — zero to `ori-1` running in ~15 minutes

> You only type the bolded commands. Everything else is scripted.
> Assumes Windows 11 + WSL2 Ubuntu 22.04, Docker Desktop running.

---

## TL;DR (already installed once, just bring it up)

```bash
# 1. Rollup daemons (runs in background via systemd --user)
bash scripts/wsl-start-rollup.sh

# 2. Backend deps
docker compose up -d postgres redis
pnpm --filter @ori/api exec prisma migrate deploy

# 3. Dev servers (two terminals, or `pnpm dev` at root if configured)
pnpm --filter @ori/api dev     # :3001
pnpm --filter @ori/web dev     # :3000

# 4. Smoke test — verifies chain + oracle + API in one shot
bash scripts/wsl-smoke-test.sh
```

**If you haven't installed yet, start at Step 1 below.**

---

## Step 1 — Install the toolchain (one-time, ~5 min)

**In WSL:**

```bash
cd /mnt/c/Users/prate/Downloads/Initia\ builder/ori
sudo apt update && sudo apt install -y build-essential jq curl git unzip
bash scripts/wsl-install-initia.sh      # installs Go + weave into ~/bin
bash scripts/wsl-install-minitia.sh     # installs minitiad + initiad into ~/bin
source ~/.bashrc                         # pick up the new PATH
```

Verify:

```bash
weave version && minitiad version | head -1 && initiad version | head -1
```

---

## Step 2 — Launch the rollup (interactive, ~5 min)

This is the only stretch you drive by hand. `weave init` asks ~15 questions;
answers are all defaults except the ones below. Have the faucet URL open:
https://app.testnet.initia.xyz/faucet

```bash
weave init
```

| Prompt | Answer |
|---|---|
| Gas Station account | **Generate new** |
| (paste address at faucet, hit submit) | type **`continue`** |
| What do you want to do? | **Launch a new rollup** |
| L1 network | **Testnet (initiation-2)** |
| VM | **Move** |
| Rollup chain ID | **`ori-1`** |
| Gas denom / moniker / intervals | **Tab** through defaults |
| Block data location | **Initia L1** |
| Oracle Price Feed | **Enable** ← required for Slinky wagers |
| System keys | **Generate new** |
| System accounts funding | **Default preset** |
| Fee whitelist | **Enter** (empty) |
| Add Gas Station to genesis? | **Yes** |
| Genesis balance | **`10000000000000000000`** |
| Additional genesis accounts? | **No** |
| Verify & continue | **`continue`** then **`y`** |

Now init the two daemons (both are also interactive but shorter — Tab through
every prompt that offers a default):

```bash
weave opinit init executor    # -> Yes, use detected / Generate / Pre-fill / Tab, Tab, Tab
weave relayer init            # -> Local Rollup ori-1 / Tab / Minimal channels / select-all / Yes
```

Don't start them yet — `wsl-post-weave.sh` starts them for you in the next step.

---

## Step 3 — Deploy contracts + bring up backend (automated)

```bash
docker compose up -d postgres redis
source scripts/wsl-post-weave.sh
```

The `source` matters — we want the deployer mnemonic to stay in your shell.
This script:

1. Starts `opinit executor` + `relayer` as daemons (idempotent)
2. Imports the gas-station key into minitiad and initiad keyrings
3. Computes `DEPLOYER_HEX` from the bech32 address
4. Runs `scripts/deploy-testnet.sh` which builds, tests, and publishes all
   17 Move modules, applies the Prisma migration, and writes
   `.initia/submission.json`

The final line prints your `DEPLOYER_HEX`. Copy it.

---

## Step 4 — Fill .env, run dev servers

```bash
cp .env.example .env   # (if not done already)
```

Open `apps/web/.env.local` and `apps/api/.env` and paste `DEPLOYER_HEX`:

```
# apps/web/.env.local
NEXT_PUBLIC_ORI_MODULE_ADDRESS=<paste>
NEXT_PUBLIC_CHAIN_ID=ori-1
NEXT_PUBLIC_RPC_URL=http://localhost:26657
NEXT_PUBLIC_REST_URL=http://localhost:1317

# apps/api/.env
ORI_MODULE_ADDRESS=<paste>
CHAIN_ID=ori-1
ORI_RPC_URL=http://localhost:26657
ORI_REST_URL=http://localhost:1317
# plus DATABASE_URL, REDIS_URL, VAPID_*, JWT_SECRET, BADGE_ISSUER_MNEMONIC
```

Generate the bits you don't have yet:

```bash
npx --yes web-push generate-vapid-keys   # paste into VAPID_PUBLIC/PRIVATE_KEY
openssl rand -hex 32                      # paste into JWT_SECRET
```

Two terminals:

```bash
pnpm --filter @ori/api dev    # :3001
pnpm --filter @ori/web dev    # :3000
```

Open http://localhost:3000. You should see the Ori landing page.

---

## Optional — MCP + A2A agent server

```bash
export ORI_MODULE_ADDRESS=<DEPLOYER_HEX>
export ORI_MCP_MNEMONIC="..."       # mnemonic of an account with funds
export ORI_A2A_PORT=3030             # enables the HTTP JSON-RPC surface
pnpm --filter @ori/mcp-server dev
```

Now you have:
- MCP (stdio) → plug into Claude Desktop
- A2A (http://localhost:3030/a2a) → any JSON-RPC 2.0 agent

---

## Pre-demo smoke — run ~2 min before every video take

In one WSL terminal (keep it open for the duration of recording):

```bash
# Make the rollup survive idle periods across WSL session closures.
echo "<your-password>" | sudo -S loginctl enable-linger $USER

# Restart daemons fresh and verify Windows can reach them.
systemctl --user restart minitiad opinitd.executor.service
sleep 6
curl -s -o /dev/null -w "rest=%{http_code}\n" http://localhost:1317/cosmos/base/tendermint/v1beta1/blocks/latest
```

Expect `rest=200`. If it says `rest=000`, WSL port forwarding is stuck. Reset:

```powershell
# In PowerShell:
wsl --shutdown
# Reopen WSL and start daemons again.
```

**Demo-day tip:** once the daemons are healthy, record immediately — the longer the rollup sits idle between Windows→WSL requests, the more likely the port forward drops. Take your main video first, short MCP clip second. If anything breaks, reset and reshoot — chain state is preserved across restarts.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `weave init` hangs at "continue" | Docker Desktop must be running with WSL integration enabled |
| `opinit start executor` fails | `weave opinit logs executor` — usually a missing key; re-run `opinit init executor` |
| `relayer` fails on start | `docker rm -f weave-relayer && weave relayer start -d` |
| `move deploy`: "named address unresolved" | You missed `--named-addresses ori=$DEPLOYER_HEX` — every build/test/deploy needs it |
| `BACKWARD_INCOMPATIBLE_MODULE_UPDATE` on redeploy | Struct layout changed. Rename the module or use a fresh deployer account |
| Bridge modal is empty locally | Expected — bridge UI only resolves registered chain IDs; works on `initiation-2` testnet |
| `auto-sign: No message types configured` | `NEXT_PUBLIC_CHAIN_ID` must match the rollup chain id EXACTLY (`ori-1`) |
| Windows `fetch failed` / `ECONNREFUSED` to rollup | WSL port forward dropped. Run `wsl --shutdown` then restart WSL + daemons |
| MCP tool `Unknown tool: ori.purchase_paywall` | Stale build. Run `pnpm --filter @ori/mcp-server build` |
| MCP `Account '…' does not exist on chain` | Mnemonic in `ORI_MCP_MNEMONIC` derived wrong address. Must be an Initia wallet (coinType 60, ethsecp256k1). Use a seed-script actor's mnemonic. |

For mainnet, see `MAINNET_DEPLOY.md`.
