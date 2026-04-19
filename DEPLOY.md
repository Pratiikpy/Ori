# Deploying Ori to production

Target architecture (Shipment 1):
- **Vercel** — Next.js web + Fastify API (wrapped as a serverless function)
- **Supabase** — Postgres database (pooled for serverless)
- **Upstash** — Redis (idempotency + rate limits)

Everything in this guide uses the free tier of each provider. Total cost to
go live: **$0/month**.

Estimated time, first-time: **15–20 minutes of clicking**. Nothing to compile
locally; Vercel builds on their side.

---

## Prerequisites

- A GitHub account with the `ori` repo pushed
- A [Vercel](https://vercel.com) account (free — sign in with GitHub)
- A [Supabase](https://supabase.com) account (free)
- A publicly reachable Initia rollup RPC (see "About the rollup" at the bottom)

---

## Step 1 — Create the Supabase project (2 min)

1. Go to https://supabase.com/dashboard → **New project**.
2. Name: `ori-prod`. Region: closest to your users. Set a strong DB password and **save it somewhere** (you need it twice below).
3. Wait ~90s for provisioning.
4. Once ready, go to **Project Settings → Database**.
5. Scroll to **Connection String**. Copy two things:
   - **"URI" (Direct connection, port 5432)** → this is your `DIRECT_DATABASE_URL`. You need this only for the one-time migration.
   - **"Transaction pooler" (port 6543)** → this is your `DATABASE_URL`. Append `?pgbouncer=true&connection_limit=1` to the end.

Example `DATABASE_URL`:
```
postgres://postgres.abcdefgh:mypassword@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
```

## Step 2 — Run the Prisma migration against Supabase (2 min)

From your laptop, in this repo root:

```bash
# Use the DIRECT URL (port 5432) for migrations only
export DATABASE_URL="<your DIRECT_DATABASE_URL>"
pnpm --filter @ori/api db:migrate:deploy
```

That creates every table (`users`, `auth_sessions`, `messages`, `payment_links`,
`payment_events`, `tip_events`, etc.). Verify by clicking **Table Editor** in
Supabase — you should see ~15 tables.

Optional: seed some test data.
```bash
pnpm --filter @ori/api tsx prisma/seed.ts
```

Unset the env var when done so you don't accidentally run other commands
against prod:
```bash
unset DATABASE_URL
```

## Step 3 — Add Upstash Redis via Vercel (3 min)

You'll provision Redis through Vercel's marketplace so the env vars auto-wire.

1. Sign in to Vercel. If you haven't already, click **Add New → Project**, select the `ori` repo, but **don't deploy yet** — just create the project.
2. In the new project: **Storage → Create Database → Upstash for Redis**.
3. Pick a region near your Vercel functions region (both default to Washington DC / us-east-1 — keep them aligned).
4. Upstash adds `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` to your Vercel env. **Ignore those two — we use ioredis TCP, not REST.**
5. Open the new database in the Vercel dashboard → **"Connect"** tab → scroll to **TCP / ioredis** — copy the `rediss://` URL. That's your `REDIS_URL`.

## Step 4 — Paste env vars into Vercel (5 min)

In your Vercel project: **Settings → Environment Variables**.

Copy each key/value from `.env.production.example` in this repo. For every
placeholder like `<your-vercel-domain>`, plug in the real value:

- For `CORS_ORIGINS` and `PUBLIC_API_URL`, use your Vercel URL (e.g. `https://ori-chat.vercel.app`). You can update these later after you attach a custom domain.
- For `DATABASE_URL`, paste your **pooled** Supabase URL with the `?pgbouncer=true&connection_limit=1` suffix.
- For `REDIS_URL`, paste the Upstash TCP `rediss://` URL.
- For `JWT_SECRET`, generate a fresh one: `openssl rand -hex 32`.
- For `ORI_RPC_URL` / `ORI_REST_URL`: your public rollup URL.
- For `VAPID_*`: generate locally with `npx web-push generate-vapid-keys`.

Apply all vars to **Production, Preview, and Development** so previews work.

## Step 5 — Deploy (1 min)

Commit any pending changes (`vercel.json`, `.env.production.example`, this
file) and push to your main branch. Vercel auto-detects and deploys. Or
manually trigger: **Deployments → Create Deployment → from main**.

Watch the build log. First deploy takes ~3 minutes. Look for:
- ✓ `Running "pnpm install..."` — deps resolve
- ✓ `prisma generate` — Prisma client built
- ✓ `Creating optimized production build ...` — Next.js compile
- ✓ `Deployment completed`

## Step 6 — Smoke-test the deploy (3 min)

Open your Vercel URL. Run through:

1. **Health** — hit `https://<your-domain>/api/health`. Expected:
   ```json
   {"status":"ok","timestamp":"2026-..."}
   ```
   If you see `{ "error": "..." }` or a timeout — check Vercel's **Functions** tab logs. Most common cause: a missing/wrong env var.

2. **Landing page** — load `/`. Should render the hero, capability tiles, flow, agents section.

3. **Sign in** — click *Sign in* in the header. InterwovenKit opens. Connect a wallet.

4. **Auth flow** — after connecting, `/today` should load. That proves the Supabase DB works (session was persisted).

5. **Send a payment** — go to `/send`, enter an amount, pick a recipient `.init` name, send. The tx should succeed and show a hash. (It won't appear in the recipient's `/today` feed yet — that needs Shipment 2's event listener.)

---

## About the rollup

For Shipment 1, the frontend talks directly to the rollup via InterwovenKit
(browser → rollup RPC). So the rollup needs a **public HTTPS URL** reachable
from the browser.

If your rollup currently runs on `localhost:26657` / `localhost:1317`:

- **Cheapest (free, dev-grade):** Cloudflare Tunnel. From your laptop:
  ```bash
  # one-time
  winget install --id Cloudflare.cloudflared   # or: brew install cloudflared
  # expose REST:
  cloudflared tunnel --url http://localhost:1317
  # expose RPC:
  cloudflared tunnel --url http://localhost:26657
  ```
  You get two `https://<random>.trycloudflare.com` URLs. Paste them into
  Vercel's `ORI_REST_URL`, `ORI_RPC_URL`, `NEXT_PUBLIC_REST_URL`,
  `NEXT_PUBLIC_RPC_URL`. Re-deploy. Note: tunnel URLs rotate when
  `cloudflared` restarts — fine for a demo, not for a real product.

- **Sturdier (free-ish, production-grade):** deploy the rollup to Fly.io
  with your existing `scripts/wsl-*start-rollup.sh` logic. Gets you stable
  URLs. ~1hr setup. Can do this in Shipment 2.

---

## Troubleshooting

### "Error: P1001: Can't reach database server"
- Your `DATABASE_URL` is the direct URL (port 5432), not the pooled one (6543). Swap to the Supabase transaction pooler URL.

### "too many connections for role"
- You're using the pooler URL but missing `?pgbouncer=true&connection_limit=1`. Add it.

### "Unsupported option: prefixUrl"
- The `ky` override in root `package.json` didn't install. On a fresh install, pnpm should pick it up. If not, run `pnpm install` once locally and commit the updated `pnpm-lock.yaml`.

### Function logs show Redis timeout
- Your `REDIS_URL` is `rediss://...` but you're hitting the wrong port. Upstash's TCP port is usually `:6379`, not REST's `:443`.

### Dashboard says DB paused after idle
- Supabase free tier pauses DB after ~1 week with no queries. Click "Restore" in Supabase dashboard. Data isn't lost.

### Cold start > 3 seconds
- Check **Vercel → Functions → Fluid compute** is enabled. That keeps warm instances. Without it, every 10-min idle = cold boot.

---

## What's NOT deployed in Shipment 1

These still run locally on your laptop (or not at all):

- **Event listener** (watches chain, writes events to DB)
- **Graphile Worker** (scheduled actions)
- **Socket.IO real-time push** (message arrivals in other user's chat)
- **Web push notifications**
- **Auto-minted badges**

All of those will ship in Shipment 2 as Supabase Edge Functions + pg_cron.
For now, Ori is a functional chat wallet minus the delightful real-time bits.
