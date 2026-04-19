# Day 1 Setup — exact commands

> Bring Ori from zero to "appchain running + contracts deployed + dev server up" in one sitting.

Platform notes:
- You're on **Windows 11 with bash**. The Initia CLI flow works best through **WSL2 (Ubuntu 22.04)** because `weave` and Docker bridges pin better on Linux. You can run the Node app natively on Windows if you prefer; the rollup tooling is the WSL path.
- All commands below assume WSL2 unless noted `[win]`.

---

## 0. Prerequisites

Install once:

```bash
# [win] Docker Desktop (running + WSL integration enabled)
# Download from https://www.docker.com/products/docker-desktop/

# WSL2 Ubuntu — run these:
sudo apt update
sudo apt install -y build-essential jq curl git unzip

# Go 1.22+
curl -L https://go.dev/dl/go1.22.10.linux-amd64.tar.gz -o /tmp/go.tgz
sudo rm -rf /usr/local/go && sudo tar -C /usr/local -xzf /tmp/go.tgz
echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc && source ~/.bashrc

# Node 24 via nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc
nvm install 24 && nvm use 24
npm install -g pnpm@9
```

Install Initia CLIs:

```bash
# Weave (rollup orchestrator)
curl -L https://github.com/initia-labs/weave/releases/latest/download/weave_Linux_x86_64.tar.gz -o /tmp/weave.tgz
tar -xzf /tmp/weave.tgz -C /tmp
sudo mv /tmp/weave /usr/local/bin/weave
weave --version

# Initiad (L1 CLI — for .init username registration)
# Minitiad (appchain CLI — for contract deployment)
# These are installed by the `initia-appchain-dev` skill OR via Weave:
weave init    # the interactive flow also asks to install minitiad; say yes
```

> If `weave init` has already run once on this machine and you want a fresh start:
> ```bash
> rm -rf ~/.weave ~/.initia ~/.minitia ~/.opinit
> docker rm -f weave-relayer || true
> ```

---

## 1. Launch the Ori rollup

Run the interactive flow. Accept defaults except:

```bash
weave init
```

Answers cheat-sheet (in order):

| Prompt | Answer |
|---|---|
| Gas Station account | **Generate new account (recommended)** |
| (copy the address, then) | Visit [https://app.testnet.initia.xyz/faucet](https://app.testnet.initia.xyz/faucet), paste, submit, type `continue` |
| What do you want to do? | **Launch a new rollup** |
| Select Initia L1 network | **Testnet (initiation-2)** |
| Virtual Machine (VM) | **Move** |
| Rollup chain ID | **`ori-1`** |
| Gas denom | press `Tab` for default (`umin`) |
| Node moniker | press `Tab` for default (`operator`) |
| Submission Interval | press `Tab` (`1m`) |
| Finalization Period | press `Tab` (`168h`) |
| Block data location | **Initia L1** |
| Oracle Price Feed | **Enable** |
| System keys | **Generate new system keys** |
| System accounts funding | **Use the default preset** |
| Fee whitelist addresses | press `Enter` (empty) |
| Add Gas Station to genesis? | **Yes** |
| Genesis balance | **`10000000000000000000`** (10^19 — Move tracks in u64) |
| Add additional genesis accounts? | **No** |
| Verify & continue | type `continue` |
| Confirm transactions | `y` |

Then start the cross-chain bots:

```bash
weave opinit init executor
# Detected keys → Yes, use detected
# Oracle system key → Generate new
# Pre-fill → Yes
# Listen address → Tab (localhost:3000)
# L1 RPC / Chain / Gas denom / Rollup RPC → Tab / Enter defaults
weave opinit start executor -d

weave relayer init
# Local Rollup (ori-1)
# Endpoints → Tab (defaults)
# Minimal channels (transfer + nft-transfer)
# Select all → Space + Enter
# Challenger key → Yes
weave relayer start -d
```

Verify:

```bash
curl -s http://localhost:26657/status | jq -r '.result.node_info.network'   # should say "ori-1"
minitiad q bank balances $(minitiad keys show gas-station -a --keyring-backend test)
```

---

## 2. Import Gas Station keys

```bash
MNEMONIC=$(jq -r '.common.gas_station.mnemonic' ~/.weave/config.json)
minitiad keys add gas-station --recover --keyring-backend test \
  --coin-type 60 --key-type eth_secp256k1 --source <(echo -n "$MNEMONIC")
initiad keys add gas-station --recover --keyring-backend test \
  --coin-type 60 --key-type eth_secp256k1 --source <(echo -n "$MNEMONIC")
```

Get your deployer hex address (the `@ori` named address):

```bash
GAS_STATION_BECH32=$(minitiad keys show gas-station -a --keyring-backend test)
DEPLOYER_HEX=0x$(minitiad keys parse "$GAS_STATION_BECH32" --output json | jq -r '.bytes')
echo "DEPLOYER_HEX=$DEPLOYER_HEX"
```

Save `$DEPLOYER_HEX` — you'll reuse it everywhere.

---

## 3. Deploy Move contracts

```bash
cd /path/to/ori/packages/contracts

# Build with named-address resolved to the deployer hex
minitiad move build --language-version=2.1 --named-addresses ori=$DEPLOYER_HEX

# Run unit tests
minitiad move test --language-version=2.1 --named-addresses ori=$DEPLOYER_HEX

# Deploy the whole package
minitiad move deploy --build \
  --language-version=2.1 \
  --named-addresses ori=$DEPLOYER_HEX \
  --from gas-station \
  --keyring-backend test \
  --chain-id ori-1 \
  --gas auto --gas-adjustment 1.4 --yes
```

After deploy succeeds, `init_module` runs automatically for each module (profile_registry, tip_jar, gift_packet, achievement_sbt, wager_escrow). No separate init calls needed — that's the benefit of the `init_module` pattern over `public entry fun init()`.

Verify:

```bash
# Should show 6 modules
minitiad q move modules $DEPLOYER_HEX --output json | jq -r '.modules[].abi | fromjson | .name'

# View a specific profile (empty for new account — expected)
minitiad q move view --from $DEPLOYER_HEX \
  $DEPLOYER_HEX profile_registry profile_exists \
  --args "[\"address:$GAS_STATION_BECH32\"]"
```

---

## 4. Set up backend infra

From the repo root:

```bash
cd /path/to/ori

# Install all deps
pnpm install

# Copy env template and fill in
cp .env.example .env
# Edit .env:
#   ORI_MODULE_ADDRESS=<paste DEPLOYER_HEX>
#   NEXT_PUBLIC_ORI_MODULE_ADDRESS=<same>
#   Generate VAPID keys:  npx web-push generate-vapid-keys → paste into VAPID_*
#   JWT_SECRET:  openssl rand -hex 32 → paste
```

Spin up Postgres + Redis:

```bash
# Minimal compose file at repo root (create if missing):
cat > compose.yaml <<'EOF'
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_USER: ori
      POSTGRES_PASSWORD: ori
      POSTGRES_DB: ori
    ports: ["5432:5432"]
    volumes: [ori-pg:/var/lib/postgresql/data]
  redis:
    image: redis:7
    ports: ["6379:6379"]
volumes:
  ori-pg: {}
EOF

docker compose up -d postgres redis
```

Run Prisma migration:

```bash
pnpm --filter @ori/api db:migrate
# When prompted for migration name, use "init"
```

---

## 5. Start backend + frontend

Two terminals (or tmux panes):

```bash
# Terminal 1 — backend :3001
pnpm --filter @ori/api dev

# Terminal 2 — frontend :3000
pnpm --filter @ori/web dev
```

Open [http://localhost:3000](http://localhost:3000). You should see the landing page.

---

## 6. Fund a test wallet and register a `.init` name

```bash
# Pick any bech32 address (your personal Keplr wallet works)
TEST_WALLET=init1your_bech32_here

# Fund it with native appchain tokens
minitiad tx bank send gas-station $TEST_WALLET 100000000umin \
  --keyring-backend test --chain-id ori-1 --yes

# Register a .init name on L1 via the Initia webapp:
# Go to https://app.testnet.initia.xyz/usernames and register there.
```

(Sponsoring `.init` registration from the Ori app is a post-Day-1 task — see master architecture doc §5.1.)

---

## 7. What to do next

At this point you have:
- ✅ Local rollup `ori-1` running with 6 Move modules deployed
- ✅ Backend at `localhost:3001` (Fastify + Socket.IO + Prisma + Redis)
- ✅ Frontend at `localhost:3000` (Next.js 16 PWA)
- ✅ The landing page rendering

Next tasks (Day 2+, from master doc):
1. Build `/onboard` page — actual social login + set_encryption_pubkey flow
2. Build `/chats` + `/chat/[initName]` — the messenger UI
3. Build `/[name].init` — public profile with tip jar
4. Wire the real wallet `signArbitrary` into `use-session.ts` (currently stubbed)
5. Wire the Move event listener in backend so tip events push to OBS overlay

## Troubleshooting

| Symptom | Fix |
|---|---|
| `weave init` hangs on "continue" | Check Docker Desktop is running AND WSL integration is enabled |
| `relayer` fails to start | `docker rm -f weave-relayer` then `weave relayer start -d` |
| Move build error `named address unresolved` | You missed `--named-addresses ori=$DEPLOYER_HEX` — it's mandatory on every build/deploy |
| Module redeploy fails with `BACKWARD_INCOMPATIBLE_MODULE_UPDATE` | You changed a struct layout. Either rename module or use a fresh deployer account |
| Prisma migrate fails | Check `DATABASE_URL` in `.env` matches compose.yaml credentials |
| Bridge modal is empty | Expected locally — bridge UI only resolves registered chain IDs. Live demo uses `initiation-2` testnet or mainnet |
| Auto-sign: "No message types configured" | Check `enableAutoSign` object key matches `NEXT_PUBLIC_CHAIN_ID` EXACTLY |
| Any `useUsernameQuery` hook error | Don't call it inside `.map()` — wrap in a child row component |
