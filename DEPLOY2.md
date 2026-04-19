# Shipment 2 — deploy the Edge Function event listener

Prereq: Shipment 1 is live (Vercel web + API, Supabase Postgres, Upstash Redis).
See `DEPLOY.md` for that. This document adds the **real-time feed** — event
listener running as a Supabase Edge Function + Realtime broadcast to the web.

Total your time: **~20 minutes**.

---

## Step 1 — install the Supabase CLI (5 min, one-time)

```bash
# macOS
brew install supabase/tap/supabase

# Windows
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# Linux / WSL
curl -fsSL https://supabase.com/install.sh | sh
```

Then log in:
```bash
supabase login
```

## Step 2 — link your Supabase project (2 min)

From the repo root:

```bash
supabase link --project-ref <your-project-ref>
```

Find `<your-project-ref>` in Supabase dashboard → Project Settings → General.
It's an 8-char slug like `abcdefgh`.

This writes `.supabase/` (gitignored) with your auth context.

## Step 3 — enable Postgres extensions (3 min)

In the Supabase dashboard → **Database → Extensions**, enable:

- **pg_cron** — schedules the event-listener invocation
- **pg_net** — allows Postgres to make HTTP calls (required by pg_cron's `net.http_post`)

Both are off by default. Flip them on.

## Step 4 — store secrets in Supabase Vault (4 min)

The event listener needs your rollup URL and the service role key. We
store them encrypted in Supabase Vault and read them from the pg_cron
invocation SQL.

In Supabase dashboard → **Project Settings → Vault → New secret**:

| Name | Value |
|---|---|
| `ori_event_listener_url` | `https://<project>.supabase.co/functions/v1/event-listener` |
| `ori_service_role_key` | your service-role key from Project Settings → API |

(Also stash the service role key in your local env as `SUPABASE_SERVICE_ROLE_KEY`
for the function deploy step.)

## Step 5 — set Edge Function secrets (2 min)

```bash
# Run these from the repo root. Values come from your Supabase project.
supabase secrets set \
  SUPABASE_DB_URL="postgres://postgres:<password>@db.<project>.supabase.co:5432/postgres" \
  SUPABASE_URL="https://<project>.supabase.co" \
  SUPABASE_SERVICE_ROLE_KEY="<service-role-key>" \
  ORI_RPC_URL="https://<your-public-rollup-rpc>"
```

Note: `SUPABASE_DB_URL` is the **direct** URL (port 5432), not the pooler.
The Edge Function holds one connection for its ~5-second lifetime; no pooler
needed.

## Step 6 — deploy the function (2 min)

```bash
supabase functions deploy event-listener
```

Verify it works manually:

```bash
curl -X POST "https://<project>.supabase.co/functions/v1/event-listener" \
  -H "Authorization: Bearer <service-role-key>" \
  -H "Content-Type: application/json"
```

Expected response:
```json
{"ok":true,"ms":1234,"processed":0,"reason":"caught-up"}
```

If you see `reason: "caught-up"`, it's working — just no new blocks since
the last poll. Fire a test transaction on the rollup, wait 30s, re-run the
curl — you should see `processed: 1+`.

## Step 7 — apply the pg_cron schedule (2 min)

```bash
supabase db push
```

This applies the migration in `supabase/migrations/20260419000001_schedule_event_listener.sql`,
which creates a cron job that calls the Edge Function every minute.

Verify:

```sql
-- In Supabase SQL Editor
select * from cron.job;
-- you should see a row with jobname='event-listener'

select * from cron.job_run_details order by start_time desc limit 5;
-- wait 60s, rerun — you should see runs with status='succeeded'
```

## Step 8 — add Supabase Realtime env to Vercel (2 min)

In Vercel → Project → Settings → Environment Variables, add two more:

```
NEXT_PUBLIC_SUPABASE_URL         = https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY    = <anon-key from Supabase → Project Settings → API>
```

Apply to **Production, Preview, Development**. Redeploy the web app so the
client picks them up. The client's `realtime.ts` adapter will flip from
Socket.IO → Supabase Realtime the moment these vars are present.

## Step 9 — smoke test end-to-end (2 min)

1. Open two browser tabs to your deployed URL, sign in with two different wallets.
2. From tab A, send a payment to tab B's `.init` name.
3. Within ~60 seconds:
   - tab A shows the tx hash immediately (Shipment 1)
   - tab B's `/today` feed refreshes with the new payment (new in Shipment 2)
   - tab B shows a real-time toast / payment card via Supabase Realtime

If the payment doesn't appear in tab B's feed within 90s, check:
- `select * from cron.job_run_details order by start_time desc limit 10;` — cron is firing
- Check `payment_events` table in Supabase Dashboard — row landed
- Browser DevTools → Network → WebSocket → you should see a Supabase Realtime connection

---

## Rolling back

If anything breaks, you can disable the cron schedule without redeploying:

```sql
select cron.unschedule('event-listener');
```

The web app's Realtime subscription will stay open but silent (no broadcasts).
Users fall back to polling `/today` on focus. Zero user impact, just no
real-time feed until you fix whatever's wrong.

To fully revert to Shipment 1, also remove the `NEXT_PUBLIC_SUPABASE_*` env
vars in Vercel and redeploy. The realtime adapter will fall back to Socket.IO,
and since there's no Socket.IO server running in prod, subscriptions are
just no-ops.

---

## Cost check

All free tier:

- **Supabase Edge Functions**: 500k invocations/month free. At 1 min intervals
  = 43k/month. Well under.
- **Supabase Realtime**: 200 concurrent connections, 2M messages/month free.
- **Supabase Postgres**: 500MB + the rows we write. Tiny.
- **pg_cron + pg_net**: free extensions, no separate metering.

## What's still out of scope

Shipment 3 (separate runbook when you're ready):
- `achievement-issuer` — auto-mints first-payment SBTs via server wallet
- `web-push-fanout` — delivers web push notifications
- `scheduled-action-runner` — drains future Graphile Worker jobs via pg_cron

None are blocking; each is ~30 min to add using the same pattern as
`event-listener`.
