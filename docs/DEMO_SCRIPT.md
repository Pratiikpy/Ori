# Ori — Demo Video Shot List (75 seconds)

> **Goal.** Make a judge say "I've never seen that before." Ori is the agent wallet for Initia — every scene must show Claude doing something a human would otherwise have to sign. The consumer chat opening earns attention. The agent climax wins the category.
>
> **The tagline**: "Let Claude spend your INIT." — single shot card at 0:00.
> **The killer moment** happens at 0:30 (agent buys paywalled post, tips author, opens a BTC prediction — one prompt). Everything before leads to it, everything after is denouement.

---

## Production rules

- **Pre-record + edit**. Do not attempt this as a single take. 5-8 distinct clips cut together.
- **60 fps screen capture**. 24 fps looks sluggish for 100 ms payments.
- **Two devices visible** for the consumer scene: a phone (Alice) and a desktop (Claude Desktop + Ori web).
- **Voice-over**: calm, low, under 120 words/min. If you must score it, keep music under −20 dBFS.
- **Burn subtitles** — many judges watch with the sound off during first-pass triage.
- **Dark theme** everywhere. Our aesthetic is black + indigo; the video should match.
- **No gas dialogs. Ever.** Auto-sign must be active for every payment-class action. Retake if one appears.
- **Safe-area on phone**: use iOS Simulator or a real iPhone so the bottom nav sits above the home bar — a squashed nav ruins the polish frame.

---

## Pre-record checklist (≤ 15 min before rolling)

- [ ] **Seeded rollup.** Run `bash scripts/wsl-run-seed.sh` — Discover, Leaderboards, Activity Feed all populated
- [ ] **Two paywalls live** at `/paywall/1` (Bob's essay) and `/paywall/2` (Dave's price API)
- [ ] **One oracle wager** open in the wagers feed (Alice vs Frank on BTC ≥ $100k)
- [ ] **Alice onboarded** with auto-sign grant not expiring in the next hour
- [ ] **Balances funded**: Alice ≥ 50 INIT, recording wallet for Claude Desktop ≥ 20 INIT
- [ ] **Claude Desktop config** in place — `claude_desktop_config.json` loads BOTH `ori` MCP and `initia-docs` MCP (see `scripts/claude-desktop-config.sample.json`)
- [ ] **Dev server on Vercel OR local**: video should prefer Vercel (shows "live URL exists") but local works if needed
- [ ] **No notifications.** Turn off Slack, email, Discord, iMessage popups for the recording window
- [ ] **Wifi tested.** No lag on the 100 ms settlement claim — reshoot if you see any
- [ ] **Screen-record one practice run** end-to-end before the real take

---

## The 75-second cut — shot by shot

**Three-act structure: Hook (0:00-0:15) → Killer moment (0:15-0:45) → Proof-of-depth (0:45-1:15).**

### ACT 1 — Hook (15s)

| Time | Shot | What | Voice-over |
|------|------|------|------------|
| 0:00–0:04 | **Title card** | Black. Centered: **"Let Claude spend your INIT."** Subtitle: *The agent wallet for Initia.* Fades out. | silence |
| 0:04–0:09 | **Chat open** | Phone (Alice). Open chat with Bob. Type: *hey — lunch was $20 today*. Send. | "Solo-first. Works without friends. But the social layer compounds when they join." |
| 0:09–0:15 | **The hero payment** | Alice taps `$`, presses `20` on the big keypad, hits Send. **Zero popup.** Payment card springs in inside the chat. Haptic pulse. Show the timestamp: ~100 ms between Send and the card. | "A hundred milliseconds. No wallet popup. Not a single tap wasted." |

> **Production note:** the payment card appearing is THE consumer-story beat. If the spring animation doesn't feel right, reshoot. This is 6 seconds of total screen time but it's the reason viewers keep watching.

### ACT 2 — Killer moment (30s)

| Time | Shot | What | Voice-over |
|------|------|------|------------|
| 0:15–0:20 | **Cutaway to desktop** | Window split: Claude Desktop on left, Ori web (Bob's profile page showing his paywalled essay) on right. | "But here's what no other app on any chain can do." |
| 0:20–0:28 | **Claude prompt** | Type into Claude Desktop: *"Claude, find Bob's paywalled post on Ori, buy it, tip him 0.2 INIT, and open a 60-second prediction that BTC goes higher. Stake 0.5 INIT."* Hit Enter. | "I'm going to ask Claude to buy paywalled content, tip the author, and open a prediction on BTC — in one prompt." |
| 0:28–0:38 | **Claude chains 5 tool calls** | Claude's panel streams five Ori tool calls in sequence: `ori.search_initia_docs` → `ori.purchase_paywall(1)` → `ori.send_tip(bob, 0.2)` → `ori.predict(BTC, 60s, higher, 0.5)` → summary. Show every tool's "done" badge. | "Five tool calls. Five on-chain transactions. Every one signed by my agent wallet. Zero popups." |
| 0:38–0:42 | **Cut to web** | Ori web flips paywall from 402 to 200. Tip lands in Bob's feed. Market #1 appears in /predict with a live countdown. | "Creator got paid. Paywall unlocked. Prediction open. One prompt." |
| 0:42–0:45 | **Hold on summary** | Back to Claude — the summary text visible plus market ID and tx hashes. Freeze for a beat. | "No other submission ships this stack: MCP plus A2A plus x402 plus a Connect-resolved prediction pool." |

> **Production note:** Claude Desktop's "tool call" UI is the visual hook — it shows the agent chain as it happens. Do NOT speed this up; the 8 seconds of tool calls is what makes the claim credible.

### ACT 3 — Proof of depth (30s)

Quick montage cuts — 3-5 seconds each — showing the other features that back the claim. Voice-over is a single continuous thought.

| Time | Shot | What |
|------|------|------|
| 0:45–0:49 | **Discover shelf** | Scroll the /discover page. See the 6 seeded profiles, top creators by tips, rising list. |
| 0:49–0:53 | **Oracle wager** | Open /wagers, tap the Alice-vs-Frank BTC wager. Show "resolves from Slinky oracle at deadline." |
| 0:53–0:57 | **Gift link** | Alice in /gift/new — pick 🎉 theme, amount $5, generate link. Copy it. |
| 0:57–1:01 | **Claim cold** | Fresh private window — paste the gift URL. Sign in with Google (Privy). Claim lands. New `.init` registered. |
| 1:01–1:05 | **Tip overlay** | Creator OBS page: a $5 tip to Carol appears live with confetti. |
| 1:05–1:09 | **Badges** | Carol's profile — 3 achievement badges visible (Early User, First Tip Received, Streamer). |

Voice-over for 0:45–1:09 (25 seconds, ~55 words):
> "Ori is also a full creator-and-social surface. Encrypted chat. Gift-wrapped payments that onboard new users in thirty seconds. Parimutuel prediction pools on any of sixteen Connect pairs. A creator tip overlay. Achievement badges you can't buy. Seventeen Move modules live on our own MiniMove rollup, settling to Initia L1."

### Close (6s)

| Time | Shot | What | Voice-over |
|------|------|------|------------|
| 1:09–1:15 | **End card** | Black. Centered: *"Ori."* then below: **"The agent wallet for Initia."** Small tagline: *Let Claude spend your INIT.* URL at bottom: `ori.chat`. | "Ori. The agent wallet for Initia." |

---

## What to say to Claude Desktop during the killer moment

Copy this exact prompt into Claude Desktop at 0:20. Tested — Claude chains the tools in the right order.

> Claude, use my Ori MCP. Search Initia docs for the paywall x402 note. Then find paywalled post 1 on Ori, purchase it, tip the author 0.2 INIT, and open a 60-second prediction that BTC/USD will be higher in a minute. Stake 0.5 INIT. Summarize the post in two sentences at the end.

This triggers, in order:
1. `ori.search_initia_docs("paywall x402")`
2. `ori.purchase_paywall(paywall_id: "1")`
3. `ori.send_tip(creator: bob, amount: "0.2")`
4. `ori.predict(token: "BTC", direction: "higher", duration_seconds: 60, amount: "0.5")`
5. Claude's own summarization pass on the returned markdown

All five shown live in the Claude Desktop tool-call pane. Five on-chain tx in under 20 seconds on ori-1.

---

## Common failure modes & recovery

| Symptom | Recovery |
|---|---|
| Auto-sign prompt appears mid-record | Stop. Go to /settings, re-enable auto-sign, restart the scene. Never ship a demo with an unexpected popup. |
| Payment card takes >200 ms to appear | Rollup is under load. Restart minitiad: `systemctl --user restart minitiad`. Wait 30s. Retry. |
| Claude Desktop doesn't show tool calls | Verify the MCP server is running with ORI_MCP_MNEMONIC set. Check `~/Library/Application Support/Claude/logs` (mac) or `%APPDATA%\Claude\logs` (Windows). |
| Paywall returns 402 after purchase | RPC lag between the purchase tx and `has_access` view. Our MCP tool already retries once with a 2.5s delay. If it still 402s, the tx failed — check the tx hash on scan. |
| Oracle wager doesn't show in feed | `EventListener` in API isn't running. `pnpm --filter @ori/api dev` should have it. |
| OBS overlay blank | Redis connection dropped. Restart `pnpm --filter @ori/api dev`. |

---

## Shortform edit (0:20, for Twitter)

Start at 0:20 (just before "But here's what no other app can do") and end at 0:45. This is the killer moment standalone. It's the clip that gets shared, so make sure the end-card fade is clean.

Caption for the tweet:
> An AI agent just bought a paywalled article on-chain and summarized it — one prompt, three protocols (MCP + A2A + x402) all wired together on Initia. Ori.

---

## Captions to burn in (lowercase, 80% opacity, Inter)

- 0:04 — `let claude spend your INIT`
- 0:09 — `100 ms · zero popup`
- 0:15 — `agent wallet for initia`
- 0:28 — `5 tool calls · one prompt`
- 0:45 — `17 Move modules · MiniMove rollup`
- 1:09 — `ori.chat`

---

## Things we deliberately do NOT show

- Seed phrases, raw key material, full wallet addresses
- Gas fee modals (if one appears, the take is dead — auto-sign broken)
- Any empty state (Discover, Leaderboards, Activity) — the seed script prevents this
- More than 4 seconds on any single shot
- Feature names nobody outside crypto knows without context ("MsgExecute", "BCS", "ExtendRef"). Translate everything to plain English in VO.

---

## If we only have 30 seconds

Submit the shortform cut (0:20–0:45 master, re-sequenced): title card (2s) → Claude prompt (4s) → tool calls + unlock (18s) → close card (6s). That's your hero clip. Everything else is context.
