# Ori — About the Product

> A plain-English product document.
> For designers and frontend developers who need to understand what we're building and how it feels, not what it's built with.

---

## What Ori is, in one sentence

**Ori is an app where your friends, your money, and your AI agents live on the same screen.** It looks and feels like iMessage. It spends money like Venmo. And AI agents can do things inside it on your behalf — send a payment, tip a creator, pay to unlock something — without you lifting a finger.

## The central insight

Your crypto identity and your actual identity shouldn't be different people.

Today, crypto apps make you paste a 42-character address to send money. Messengers pretend payments don't exist. Venmo pretends the internet stops at the US border. Ori doesn't play that game. **One name. One surface. Messages, payments, agents — all equal citizens.**

## Who it's for

Three people, in order:

1. **A college student** who wants to split a dinner bill with five friends, send their roommate rent, and tip a creator they follow — all from one app, none of which require explaining what a "private key" is.
2. **A creator** on YouTube or Twitch who wants to accept tips, sell access to gated posts, and run a live tip overlay on their stream — without setting up Stripe, PayPal, or a donation site.
3. **An AI power-user** who wants their assistant (Claude, ChatGPT, or whatever else) to be able to *actually do things with money*, not just talk about doing them. Ask your agent to "tip alice.init 5 bucks for the great stream" and it happens.

## The chain underneath

Ori runs on **Initia** — a new kind of blockchain where:

- **Settlement is fast enough to be invisible.** Payments land in about 100 milliseconds. Not "pending." Not "confirming." Landed. This is the only reason in-chat payments feel native instead of awkward.
- **Your username IS your identity.** Initia has a native username system (`.init` names — like `alice.init`). We use it as the identity spine everywhere: chat handles, profile URLs, payment recipients, social graph.
- **You can approve once and forget.** Initia supports "auto-signing" — a one-time grant that authorizes specific actions for 24 hours. After the first tap, every subsequent payment is zero-popup.
- **Money can come in from other chains.** Initia has a built-in bridge. First-time users who have assets on another chain can bring them in during onboarding, one tap.
- **Price feeds are first-class.** Initia's built-in oracle (called Slinky) publishes live prices for Bitcoin, Ethereum, and dozens of other assets on-chain. Ori uses this so friendly bets on "will BTC hit $100K by December?" resolve themselves, automatically, without anyone arguing about who won.

## How Ori feels, moment by moment

### First open
A landing screen that says one thing clearly: **"The agent wallet for Initia. Let Claude spend your INIT."** One button. "Get started — 30 seconds."

### Onboarding (~30 seconds, that's the promise)
- Connect a wallet OR sign in with Google/email (both work — same account underneath).
- Pick your `.init` name if you don't have one. If we're sponsoring registrations, it's free to you.
- A one-tap explainer: *"Three things about paying here. 1) Pay a name, not an address. 2) Settles in 100ms. 3) Lands inside the conversation."*
- Done. Your first payment is already seeded into your wallet (we pre-fund you a tiny amount so your very first send doesn't need a faucet).

### Opening the app for the 2nd time
- Chats list. Just like iMessage. Names, timestamps, unread count, recent activity.
- Anyone active in the last 2 minutes has a small lightning bolt ⚡ next to their name — tells you who's "live right now" without pretending to be more precise than it is.
- Tap a chat. It opens. The avatar has a ring around it that glows blue when they're typing.

### Sending money (the moment)
Inside any chat:
- Tap the `$` icon.
- A giant number-pad slides up from the bottom. The amount fills the top half of the screen. The `$` symbol lives at the bottom corner where you can scale the denomination.
- Tap "Send."
- No wallet popup. No "confirm transaction." No "signing..."
- ~100 milliseconds later, a payment card appears inline in the conversation. Both people see it at the same time.
- If it's the recipient's very first payment ever on Ori, a tiny confetti burst plays on the card.

This is the single most important interaction in the app. It should feel inevitable.

### Everything else a user can do

#### Chat
- End-to-end encrypted by default. Even we can't read messages.
- Works on multiple devices — you log in on a new phone and all your old messages decrypt. (Technically clever; feels normal.)
- Read receipts. Typing indicators. Message reactions.
- Bill splits inline: send a split request to a group, see who's paid, tap to pay your share.

#### Gifts (payments in wrapping paper)
- Send a themed gift — birthday, thanks, congrats, custom.
- Or create a *gift link* — a URL that anyone can claim, even if they don't have Ori yet. Tap it, onboard, claim the money. Cash App's killer growth loop, but on-chain.
- If no one claims within a window, the sender can reclaim. No money vanishes.

#### Creator tools
- **Public profile at `ori.chat/alice.init`** — bio, avatar, link-in-bio style links, a tip jar front and center.
- **Tip jar** with a 1% platform fee (we take less than every other tip platform).
- **OBS overlay** at `ori.chat/obs/alice.init` — streamers drop this into their stream and every tip shows up live with a confetti animation. Free marketing loop: new viewers see tips happening, tip themselves, appear on the overlay.
- **Paywalls** — sell access to a piece of gated content (a long-form post, a file, a private video). Share the `ori.chat/paywall/123` link anywhere — Twitter, Discord, email. Anyone clicks it, sees a pay button, unlocks. Works for humans AND for AI agents (see below).
- **Subscriptions** — recurring payments. Supporters can subscribe to you monthly. Auto-renews via the auto-sign grant.
- **Payment streams** — money flowing per-second. A consulting relationship can be "I'll pay you $50/hour streamed live as you work." Stops whenever either side says stop.

#### Friendly wagers
- Bet a friend on anything ("You'll finish the marathon in under 4:30").
- Two resolution modes:
  1. **Human arbiter** — you both pick a neutral third person (by `.init` name) who decides who won. Stakes held in escrow.
  2. **Oracle-resolved** — for price bets ("BTC ≥ $100K by Dec 31"), no arbiter needed. The chain reads the price from Slinky automatically on the deadline and pays the winner.

#### Social graph
- Follow people. See their activity.
- A "trust score" accumulates from on-chain actions — sending, receiving, tipping. Spammer wallets score low; real users score high.
- Achievement badges (like Pokémon badges, but for payment milestones): First Payment, First Tip Received, 30-day Streak, Early User, etc. Non-transferable, so you can't buy status.

#### Discover
- **Recent** — creators who just got tipped
- **Top Creators** — ranked by tips received
- **Rising** — creators with unusual recent tip growth

#### Bridge in / out
- During onboarding or any time after, tap "Bridge in from Initia L1" — brings funds from the main Initia chain into Ori's appchain in one tap.

### The AI layer (this is the big swing)

Ori is **agent-native**. Every action you can do in the app, an AI agent can also do on your behalf, using standard protocols that every major AI framework speaks.

**What this looks like for a user:**

- You open Claude Desktop on your computer.
- You've installed the Ori plugin (one config file, ~20 seconds).
- You type: *"Claude, tip alice.init 5 dollars for the great stream."*
- Claude thinks. Claude calls Ori. The tip happens. Claude says: *"Done. Tipped alice.init 5 USD, tx landed in 100ms."*
- The tip appears in Ori on your phone instantly.

**What this looks like for developers:**

- Anyone building an AI agent (customer support bot, trading bot, content agent) can hook it into Ori over a standard internet API.
- Agents can: send tips, send payments, create gift links, check balances, look up profiles, unlock paywalls, open wagers.

**What this looks like for website owners:**

- You run a blog. You have a premium post.
- You put it behind an Ori paywall.
- When a human visits, they see a nice "Unlock for $1" page.
- When an AI agent visits (say, a research agent scraping the web on behalf of its user), the site automatically tells the agent: *"This page costs $1. If you want it, call this smart contract." The agent pays, retries, gets the content.* No human in the loop.

This last pattern is new. No other messaging or payment app on any blockchain has it.

## Design direction

The product should look and feel like it grew up inside Initia's aesthetic. Specifically:

- **Deep off-black background** (not pure black — that's oppressive). Think `#0a0a0a`, with subtle warmth.
- **Electric indigo as the only bright accent** (around `#4349ff`). Used sparingly — for the primary CTA, the tip-jar lightning, the payment card border.
- **Monospace for anything numerical** — addresses, transaction hashes, amounts. Inter for everything else.
- **1-pixel borders at 6% opacity white** for cards and dividers. No heavy lines. No gray boxes.
- **Rounded-2xl (16px) for cards. Rounded-full for chips and buttons.** Consistent. No mixing.
- **Icons are always stroked, never filled.** 1.5px stroke width. Hand-drawn feel.
- **Motion**: payment cards spring in (brief overshoot, quick settle — feels alive). Confetti bursts are rare — reserved for genuine delight moments (first payment, unlock). Typing rings pulse, but slowly.
- **No gradients** except on default-generated avatars (deterministic gradient based on name hash — so `alice.init` always has the same avatar everywhere without needing an image upload) and the Ori logo mark.
- **Generous whitespace**. At least 24px between sections. Crypto apps cram information. Ori breathes.

The target emotional state: *calm, fast, grown-up.* The opposite of crypto-casino aesthetic. The opposite of CEX-exchange density. Closer to iOS Messages than to Binance.

## What we deliberately do NOT do

- No token launch, no points, no speculative loop. Ori is infrastructure, not a casino.
- No "connect 5 wallets to earn rewards" flows. One identity, one place.
- No public broadcast social timeline. Ori is private conversations + curated creator surfaces.
- No custody of user funds. Everything settles on-chain, users hold their own keys (or use social login, same outcome underneath).

## Screens the designer will touch

A map of every page, ordered by how often a user sees them:

| Screen | Path | What happens here |
|---|---|---|
| Chats list | `/chats` | Home screen. All conversations with activity signals. |
| Individual chat | `/chat/alice.init` | Messages + inline payments + gifts + bill splits |
| Send | `/send` | Big-number keypad for directed payments |
| Onboard | `/onboard` | 30-second identity setup |
| Profile | `/alice.init` | Public page — bio, tip jar, activity feed |
| Discover | `/discover` | Three shelves: Recent, Top, Rising |
| Paywall gate | `/paywall/:id` | Content-is-locked screen |
| Paywall purchase | `/paywall/:id/pay` | Unlock button for logged-in users |
| Settings | `/settings` | Profile editing, auto-sign grant, privacy |
| Portfolio | `/portfolio` | Your on-chain stats — payments sent, received, streak |
| Gift creator | `/gift/new` | Pick theme, amount, recipient (or generate a link) |
| Gift claim | `/claim/:code` | What recipients land on from a gift link |
| Bulk send | `/send/bulk` | Paste a list of `.init` names + amounts |
| OBS overlay | `/obs/alice.init` | Transparent stream overlay for creators |
| Followers / Following | `/:name/followers` etc. | Social graph lists |

Landing page (`/`) is a separate aesthetic concern — it's the first impression for people who aren't yet users.

## Moments of delight (keep these)

1. **Confetti on first received payment.** Happens exactly once per browser, ever.
2. **Haptic tap on send.** Phone vibrates briefly — a tap when you hit "Send," a confirmation when the payment lands, a short rejection buzz on failure.
3. **Payment card spring animation.** Cards slide in with a gentle overshoot, not a linear ease.
4. **Typing ring on avatar.** Soft blue pulse around the other person's avatar when they're typing.
5. **Lightning ⚡ next to fresh contacts.** Shows up only if the person was active in the last 2 minutes.
6. **Confetti on the OBS overlay** when a tip lands, for streamer viewers to see.

Everything else should be quiet.

## Tokenomics — by design, Ori has none

We do not launch a token. Ori is not a speculation vehicle. Users never have to decide whether to "buy the Ori coin" before using the app.

On mainnet, the app uses **bridged INIT** (Initia's native asset) as the currency users see in their balance. When someone tops up, they bridge real INIT from Initia L1 via the Interwoven Bridge — the same one-tap flow already built into onboarding. Every payment, tip, gift, paywall, subscription, and wager denominates in that same real asset.

Ori's revenue comes from transparent, on-chain platform fees:
- 1% on tips (tip jar)
- 1% on wager payouts
- Small split on paywall purchases (set by the creator)

All fees denominate in the same real asset the user already holds. No inflation, no emissions, no vesting schedule, no "token for governance that nobody asked for." This is the **Base / Arbitrum / Optimism** playbook — none of them launched tokens just because they could.

## One-sentence thesis

**Ori is what messengers would be if payments were native to the protocol instead of bolted on by banks — and now AI agents live here too.**
