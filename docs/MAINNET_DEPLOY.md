# Mainnet Deployment — Ori

> **When to run this**: after all features are working on the local/testnet rollup
> AND the demo video is recorded (so a bad mainnet push doesn't block a retake).

Mainnet deployment has two independent targets:

1. **Move contracts on Initia L1 (`interwoven-1`)** — mirrors iUSD Pay's shipped path. Gives you the "live on mainnet" badge. ~USD 50-100 in mainnet INIT.
2. **Vercel + Railway for frontend + backend** — so a judge can hit a live URL.

You don't need to run your own mainnet rollup to win.

## Part 1 — Deploying Move contracts to Initia mainnet

### Prereqs
- `minitiad` and `initiad` installed
- Mainnet INIT in a Gas Station key (`~/.weave/config.json`)
- Bech32 deployer address + hex form (same key we used on testnet)

### 1.1 Build for mainnet

Mainnet uses a different deployer hex because the genesis Gas Station address
is different. Recompute `DEPLOYER_HEX` against your mainnet key:

```bash
GS_MAIN=$(initiad keys show gas-station -a --keyring-backend test)
DEPLOYER_HEX_MAIN=0x$(initiad keys parse "$GS_MAIN" --output json | jq -r '.bytes')

cd packages/contracts
initiad move build \
  --language-version=2.1 \
  --named-addresses ori=$DEPLOYER_HEX_MAIN
```

### 1.2 Fund the deployer

- Acquire INIT on a CEX/DEX that lists it.
- Transfer to your `init1…` mainnet address.
- Verify with `initiad q bank balances $GS_MAIN --node https://rpc.initia.xyz`.

### 1.3 Deploy

```bash
initiad tx move publish build/ori/bytecode_modules \
  --upgrade-policy=compatible \
  --from gas-station \
  --keyring-backend test \
  --chain-id interwoven-1 \
  --node https://rpc.initia.xyz \
  --gas auto --gas-adjustment 1.4 --yes
```

Verify in the explorer: `https://scan.initia.xyz/interwoven-1/modules/$DEPLOYER_HEX_MAIN`

### 1.4 One-time init calls

The `init_module` functions auto-run on publish, so no extra calls needed. But
confirm each module has state initialized (`Config`, `GiftStore`, `WagerStore`,
`Registry` for achievement_sbt):

```bash
initiad q move resources $DEPLOYER_HEX_MAIN \
  --node https://rpc.initia.xyz --output json \
  | jq -r '.resources[].struct_tag'
```

## Part 2 — Frontend on Vercel

### 2.1 Project

```bash
# From repo root
vercel link            # choose "ori-web" as project name
vercel env pull        # if you already set envs
```

### 2.2 Environment variables (Vercel dashboard or `vercel env add`)

Mirror the `.env.example` NEXT_PUBLIC_* values against **mainnet**:

```
NEXT_PUBLIC_NETWORK=mainnet
NEXT_PUBLIC_CHAIN_ID=interwoven-1
NEXT_PUBLIC_RPC_URL=https://rpc.initia.xyz
NEXT_PUBLIC_REST_URL=https://rest.initia.xyz
NEXT_PUBLIC_ORI_MODULE_ADDRESS=<DEPLOYER_HEX_MAIN>
NEXT_PUBLIC_L1_CHAIN_ID=interwoven-1
NEXT_PUBLIC_L1_REST_URL=https://rest.initia.xyz
NEXT_PUBLIC_API_URL=https://api.ori.chat
NEXT_PUBLIC_WS_URL=wss://api.ori.chat
NEXT_PUBLIC_APP_URL=https://ori.chat
NEXT_PUBLIC_NATIVE_DENOM=uinit
NEXT_PUBLIC_NATIVE_SYMBOL=INIT
NEXT_PUBLIC_NATIVE_DECIMALS=6
NEXT_PUBLIC_BRIDGE_SRC_CHAIN_ID=interwoven-1
NEXT_PUBLIC_BRIDGE_SRC_DENOM=uinit
```

### 2.3 Deploy

```bash
vercel --prod
```

Wire the domain:

```bash
vercel domains add ori.chat
vercel dns set ori.chat '@' CNAME cname.vercel-dns.com
```

## Part 3 — Backend on Railway

### 3.1 Create services

Railway dashboard:

1. New project → `Deploy from GitHub` → choose `ori` repo.
2. Add service: the `apps/api` directory.
3. Add PostgreSQL and Redis plugins.
4. Paste full `.env` (non-`NEXT_PUBLIC_` vars) into the API service:
   ```
   NODE_ENV=production
   HOST=0.0.0.0
   PORT=${{PORT}}
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   REDIS_URL=${{Redis.REDIS_URL}}
   CORS_ORIGINS=https://ori.chat,https://www.ori.chat
   JWT_SECRET=<32+ chars from `openssl rand -hex 32`>
   SESSION_TTL_HOURS=720
   CHAIN_ID=interwoven-1
   ORI_RPC_URL=https://rpc.initia.xyz
   ORI_REST_URL=https://rest.initia.xyz
   ORI_MODULE_ADDRESS=<DEPLOYER_HEX_MAIN>
   L1_CHAIN_ID=interwoven-1
   L1_REST_URL=https://rest.initia.xyz
   L1_USERNAMES_MODULE=0x42cd8467b1c86e59bf319e5664a09b6b5840bb3fac64f5ce690b5041c530565a
   VAPID_PUBLIC_KEY=...
   VAPID_PRIVATE_KEY=...
   VAPID_SUBJECT=mailto:ops@ori.chat
   ```

### 3.2 Start command + migrations

Railway → Settings → **Start Command**:
```
pnpm --filter @ori/api db:migrate:deploy && pnpm --filter @ori/api start
```

### 3.3 Custom domain

- Add `api.ori.chat` in Railway → Domains.
- DNS: `api CNAME <railway-provided-host>`.

## Part 4 — Smoke test mainnet

```bash
# API healthy?
curl https://api.ori.chat/health

# Frontend reachable?
curl -I https://ori.chat

# Can we read a profile from mainnet?
curl "https://api.ori.chat/v1/profiles/<your init1… mainnet address>"
```

Open `ori.chat` on your phone:
1. Sign in with Google → wallet provisioned.
2. Register a mainnet `.init` at `app.initia.xyz/usernames`.
3. Onboard through Ori → publish pubkey on-chain.
4. Send yourself (from another device) a mainnet gift via link.
5. Claim. Confirm end-to-end.

If every step works, Ori is live on mainnet.

## Part 5 — Final submission artifacts

Before hitting submit on DoraHacks:

- [ ] `git add . && git commit -m "mainnet deploy"` — record the final SHA.
- [ ] Update `.initia/submission.json` with real values:
  - `commit_sha` → final commit
  - `rollup_chain_id` → `interwoven-1` (since contracts are on L1) OR `ori-1` if you also ship the testnet rollup (dual-target is fine — pick `interwoven-1` for the badge)
  - `deployed_address` → `DEPLOYER_HEX_MAIN`
  - `demo_video_url` → YouTube link (unlist until final review if you want)
- [ ] README: update the live demo link, explorer link, demo video link.
- [ ] DoraHacks submission: attach the GitHub repo URL + submission.json commit link + demo video.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `insufficient fees` on mainnet publish | Pass `--fees 50000uinit` explicitly; `--gas auto` can under-estimate on mainnet |
| Contracts publish but `init_module` state not present | Pass `--upgrade-policy=compatible` and verify no pre-existing modules at the same address. If there are, use a fresh deployer |
| Frontend can't bridge | Bridge modal only resolves registered chains. `interwoven-1` is registered, but your rollup (`ori-1`) is not — that's expected on a hackathon timeline. |
| WS disconnects on Railway | Ensure Railway's HTTP target supports `wss://`. If not, fall back to Socket.IO polling transport (already a fallback in our config). |
| OBS overlay empty | Creator address on the OBS URL must be bech32, not `.init`. Use `https://ori.chat/obs/<init1…>` as the browser-source — the page resolves the name internally. |
