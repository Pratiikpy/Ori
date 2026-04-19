# Deploying Ori's web app to Vercel

> The tricky part isn't Vercel — it's exposing the local `ori-1` rollup so a
> publicly-hosted frontend can talk to it.

## The problem in one sentence

Our `apps/web` code calls `http://localhost:26657` (rollup RPC) and
`http://localhost:1317` (rollup REST). A Vercel-hosted frontend can't reach
your laptop's localhost, so we need to expose the rollup over a public URL.

## Three paths, ranked by effort

### Path A — Cloudflare Tunnel (recommended, ~25 minutes)

Exposes your local minitiad ports over public HTTPS subdomains without
opening any ports on your router. Free. Works across reboots if you use the
`--name` flag.

```bash
# Inside WSL:
echo "ethseeker" | sudo -S apt-get install -y cloudflared
cloudflared tunnel login                                    # opens browser, pick a zone you own
cloudflared tunnel create ori-rollup                        # creates a credential JSON
cloudflared tunnel route dns ori-rollup rpc.yoursite.dev    # DNS record for RPC
cloudflared tunnel route dns ori-rollup rest.yoursite.dev   # DNS record for REST

# Run it — this holds the connection:
cloudflared tunnel --url http://localhost:26657 run ori-rollup
```

Then set your Vercel env to the public URLs:

```
NEXT_PUBLIC_RPC_URL=https://rpc.yoursite.dev
NEXT_PUBLIC_REST_URL=https://rest.yoursite.dev
```

**Trade-off:** your laptop must stay on for the demo URL to work. Fine for a
week of judging, not for a year of production.

### Path B — Fly.io / Railway / DigitalOcean VM (clean, ~2 hours)

Deploy minitiad to a public cloud VM. Rollup keeps running 24/7. Vercel
points at the VM's public IP/hostname. This is the "real" answer.

Rough shape:
1. Spin up a 2 vCPU / 4 GB VM
2. Install `minitiad` on it
3. Copy over `~/.minitia` from your laptop (tar the whole dir)
4. Open ports 26657 + 1317 via firewall
5. Run `minitiad start` as a systemd service
6. Add OPinit executor + relayer the same way

Advantage: judges can click the Vercel URL anytime for a month. Demo day
doesn't depend on your laptop being awake.

### Path C — Don't use Vercel for the demo (cheap escape hatch)

Record the demo on `http://localhost:3000`. Upload the video. In the
submission form, put `https://github.com/<you>/ori` as the "live URL" and
reference `RUNBOOK.md` which shows judges how to run locally in 15 minutes.

**Why this is actually defensible:** Initia is an L1/L2 platform. Judges
are technical. A clean local-run story scores the same as Vercel for them.
The risk is only for *non-technical* skim-viewers who want a clickable link.

## Our recommendation — Path A + Path C as backup

Today, set up Cloudflare Tunnel. Record the video against the tunneled
Vercel deploy. Submit with the Vercel URL. If the tunnel drops during
judging, the video still shows it working, and the RUNBOOK.md is there
as the reproducible fallback.

## Vercel side — the config that actually works

```jsonc
// apps/web/vercel.json (optional — Vercel auto-detects Next.js)
{
  "framework": "nextjs",
  "buildCommand": "pnpm --filter @ori/web build",
  "installCommand": "pnpm install --frozen-lockfile"
}
```

Set these environment variables in Vercel project settings (Preview + Production):

| Key | Value |
|---|---|
| `NEXT_PUBLIC_CHAIN_ID` | `ori-1` |
| `NEXT_PUBLIC_RPC_URL` | your tunneled or VM RPC URL |
| `NEXT_PUBLIC_REST_URL` | your tunneled or VM REST URL |
| `NEXT_PUBLIC_ORI_MODULE_ADDRESS` | `0x05dd0c60873d4d93658d5144fd0615bcfa43a53a` |
| `NEXT_PUBLIC_NATIVE_DENOM` | `umin` |
| `NEXT_PUBLIC_NATIVE_SYMBOL` | `INIT` |
| `NEXT_PUBLIC_NATIVE_DECIMALS` | `6` |
| `NEXT_PUBLIC_L1_CHAIN_ID` | `initiation-2` |
| `NEXT_PUBLIC_L1_REST_URL` | `https://rest.testnet.initia.xyz` |
| `NEXT_PUBLIC_L1_USERNAMES_MODULE` | `0x42cd8467b1c86e59bf319e5664a09b6b5840bb3fac64f5ce690b5041c530565a` |
| `NEXT_PUBLIC_L1_USERNAMES_PORTAL_URL` | `https://app.testnet.initia.xyz/usernames` |
| `NEXT_PUBLIC_BRIDGE_SRC_CHAIN_ID` | `initiation-2` |
| `NEXT_PUBLIC_BRIDGE_SRC_DENOM` | `uinit` |
| `NEXT_PUBLIC_API_URL` | your deployed API URL (see below) |

### Monorepo note

Vercel needs to know which package to build. In the project settings:

- **Root Directory**: `apps/web`
- **Framework Preset**: Next.js
- **Build Command**: (leave default — `next build` runs from that dir)
- **Install Command**: `pnpm install` (with workspace support auto-enabled by Vercel)

## The API (Fastify) needs its own home

Our web talks to `@ori/api` (Fastify) for:
- Auth (JWT sessions)
- Chat messages (socket.io + Postgres)
- Discover / Leaderboards (Prisma queries)
- Sponsor endpoints (pays gas from backend signer)

Options, in order of difficulty:
- **Railway** or **Render** — 1-click Fastify + Postgres + Redis. ~30 min. Our `apps/api` is ready for this.
- **Fly.io** — more control, same complexity.
- **Skip** — the MCP tool `ori.search_initia_docs` doesn't need our API, only
  the rollup. For a killer-moment-focused demo you can ship Vercel web
  talking only to the rollup and skip the API entirely (disables chat +
  leaderboards + sponsor, keeps the agent demo).

If you ship the API: make sure Postgres + Redis are available to it in
prod. Railway bundles both. Set `DATABASE_URL` + `REDIS_URL` in the env.

## Vercel deploy — step by step

1. Push your repo to GitHub.
2. https://vercel.com/new → Import the repo → pick `apps/web` as root dir.
3. Paste all env vars from the table above.
4. Deploy. First build takes ~4 minutes for our 900-file workspace.
5. Once green, grab the `https://ori-*.vercel.app` URL.
6. Put that URL in `.initia/submission.json` under `live_app_url`.

Done. Test in a private window — if `/paywall/1` returns 402 with the full
x402 header set, we're live end-to-end.
