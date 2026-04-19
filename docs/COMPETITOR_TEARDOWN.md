# Competitor teardown — InitPage, Caleb, DropPilot

> Built 2026-04-18 after cloning each repo and running `graphify update .` on them.
> Graph reports live in each repo's `graphify-out/GRAPH_REPORT.md`.

## Scale comparison (graphify node counts)

| Project | Files | Nodes | Edges | Communities |
|---|---|---|---|---|
| **Ori (us)** | 121 | 479 | — | 63 |
| **InitPage** | 248 | 806 | 1502 | 94 |
| **Caleb** | 26 | 120 | 168 | 21 |
| **DropPilot** | 30 | 87 | 108 | 23 |

**Read:** InitPage is 1.7× our codebase. Caleb + DropPilot are 3-5× smaller than us.

---

## Threat ranking

### 🥇 InitPage — 85% threat
- **Live at init.superpa.ge** — we are not live. This is their biggest lead.
- **Video published** (https://youtu.be/q2V8m6cD13g) — we have none yet.
- 12 MCP tools vs our 11 (rough tie).
- ERC-8004 identity (3 Solidity contracts).
- **Shopify physical-goods commerce** — "agent buys real sneakers with USDC" is a demo wow-factor.
- Uses Gemini 2.5 Flash (not Claude). Minor — MCP-hackathon probably favors Claude but they're multi-LLM.
- MiniEVM (Solidity) vs our MiniMove (16 Move modules).

**Their gaps (our wedge):**
- **No messaging.** Zero chat/DM surface. Pure commerce marketplace.
- **No consumer social primitives** — no tips, no gifts, no wagers.
- **No oracle integration.** Slinky-resolved wagers are uniquely ours.
- **No .init name UX as a tool.** They use usernames internally but don't expose.
- MongoDB backend (we're Postgres + Prisma).

### 🥈 Caleb — 35% threat
- **Live at caleb.sandpark.co + app.caleb.sandpark.co.**
- Single-feature: verifiable AI trading agent.
- 5-step audit log on-chain (POLICY → MARKET → DECISION → CHECK → EXECUTION).
- 9 policy gates.
- Uses Venice AI (Llama 3.3-70B), not Claude.
- **Strategic asset: `INITIA_BUG_REPORT.md` documenting 8 real Initia DX bugs**. This is a DevRel gift — judges will love it.

**Their gaps (our wedge):**
- Narrow — only trading.
- No messaging, no creator economy, no consumer surface.
- Venice/Llama instead of Claude MCP.
- Cohesion scores in graphify report show only 2-3 tight clusters — most is boilerplate.

### 🥉 DropPilot — 25% threat
- Live at drop-pilot-ten.vercel.app (Vercel frontend + Render agent).
- Single-feature: auto-buy NFT drops.
- Uses Move VM (droppilot-1 rollup, BRIDGE_ID 1831).
- On-chain `AgentWallet` struct with `budget`/`spent`/`active` — Move enforces spend limits.
- Chat is CLI-text, not real UI chat.

**Their gaps (our wedge):**
- Narrow — only drops/sneaker-sniping.
- **Admitted weakness:** "users fund a shared agent wallet" (pooled funds, not per-user escrow).
- No messaging, tips, gifts, wagers, docs, oracle.
- No A2A, no x402, no MCP search-docs integration.
- Just 1 Move module (drops.move, ~595 lines).

---

## Features we could absorb (ranked by effort × impact)

### ✅ WORTH IT — absorb these

1. **`ori.discover_x402` tool** (~30 min)
   Mirror InitPage's `x402_discover`. Takes a URL, probes for `402 Payment Required` + `X-Payment-*` headers.
   - Signals "we speak x402 beyond our own app"
   - Demo line: "agent, check if any URL on the web supports x402"

2. **Agent activity panel in web UI** (~45 min)
   No new module. Read `payment_router` events filtered by MCP signer address → show "Agent spent X INIT on [paywall Y / tip Z / wager W] at [time]".
   - Nods at both Caleb's audit log framing AND DropPilot's dashboard
   - Kills DropPilot's "spending cap" angle by exposing our MCP's on-chain history transparently

3. **Initia DX feedback note** (~15 min, 1 paragraph in README)
   Add a short `## Building on Initia — what worked, what we wish existed` section. Mirror Caleb's DevRel-friendly approach without the aggression.

### ❌ SKIP — scope creep or misfit

- ❌ **On-chain AgentWallet budget cap** (new Move module). Too risky before submission. Ours uses off-chain MCP mnemonic — simpler, well-understood.
- ❌ **ERC-8004 reputation contracts**. We already have `reputation` + `achievement_sbt` Move modules. Re-implementing in Solidity is backwards.
- ❌ **Shopify / physical commerce**. Wrong axis for consumer super-app.
- ❌ **Policy gates engine**. Useful for a trader agent, irrelevant for payment/social/creator flows.
- ❌ **5-step audit log pattern** (Caleb). Overkill for payments where the tx IS the audit.

---

## Pitch sharpening (use this in the demo)

### Hard differentiators to lead with

1. **"The only submission with encrypted messaging and payments on the same surface."**
   InitPage has commerce. Caleb has trading. DropPilot has drops. Nobody has CHAT.

2. **"Oracle-resolved wagers — bet on the INIT price, Slinky settles it."**
   Zero competitors touched `initia_std::oracle`. Unique.

3. **"16 Move modules, not 1."**
   DropPilot = 1 module. We = 16. Financial-primitive safety of Move at real scale.

4. **"Agent speaks 3 protocols at once: MCP + A2A + x402."**
   InitPage also claims this, but their MCP is 1-axis (commerce). Ours spans payments/tips/gifts/wagers/docs/identity (11 tools across 6 axes).

### Concessions to address proactively

- **"We're not live yet."** → Fix before submission (see next section).
- **"InitPage has more commercial integrations."** → Counter with "our thesis is consumer, theirs is B2B commerce. Different games."
- **"DropPilot has Move budget caps, we don't."** → Counter with "our MCP is per-user auth — no pooled funds, no budget escape."

---

## What we MUST ship before submission (in priority order)

| Priority | Task | Time | Why |
|---|---|---|---|
| P0 | Deploy web + API live (even if ephemeral via Cloudflare Tunnel) | 1-2h | InitPage is live. We can't submit URLs saying REPLACE_AFTER_*. |
| P0 | Record 75s demo video | 30 min | InitPage has one. Not optional. |
| P0 | Push repo to GitHub + fill `repo_url` | 10 min | Trivial but blocking. |
| P1 | Add `ori.discover_x402` MCP tool | 30 min | Closes the one tool-surface gap with InitPage. |
| P1 | Agent activity panel in web | 45 min | New visual. Pre-empts Caleb/DropPilot framing. |
| P2 | DX feedback paragraph in README | 15 min | Cheap DevRel brownie points. |

**Total: ~3.5 hours of build work before we can submit confidently.**
