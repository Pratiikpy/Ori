/**
 * Static design-data ported from ui-ref-orii/frontend/src/data/oriData.js.
 *
 * Two categories per spec:
 *  • Form/config data (verbatim copy): media, landingStats, navItems,
 *    moneyTabs, playTabs, profileActions, mcpTools.
 *  • Mock runtime data (TODO 5G, replace with real hooks): currentUser,
 *    threads, agentActions, authorizedAgents, portfolio, discover,
 *    oraclePrices, leaderboards, achievements, quests.
 *
 * Note: this is a SEPARATE file from `lib/ori-data.ts`, which holds the
 * action-catalog typed against ActionDef. They coexist; consumers should
 * import this one from `@/data/ori-data` and the action catalog from
 * `@/lib/ori-data` per existing usage.
 */

export const media = {
  hero:
    "https://static.prod-images.emergentagent.com/jobs/1f6a389b-3674-482c-88fd-88240c5d1b3e/images/a8f1bfbf4445e5bed6ffc79649dd415abc25441ac2b61def1751809bc6c53a47.png",
  grid:
    "https://static.prod-images.emergentagent.com/jobs/1f6a389b-3674-482c-88fd-88240c5d1b3e/images/a5517a2a93976572a553629d01a045f2e188e9002a38dcca77772a0693d61753.png",
  agent:
    "https://static.prod-images.emergentagent.com/jobs/1f6a389b-3674-482c-88fd-88240c5d1b3e/images/66f0d3bf52c7512162fdfe6b9d2b767f72b09cb3aac99b2e884f514fc2b1fdcd.png",
  gift:
    "https://images.pexels.com/photos/18069160/pexels-photo-18069160.png?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
}

// TODO 5G: replace with useInterwovenKit() data + profile fetcher.
export const currentUser = {
  name: "Mira Ito",
  handle: "mira.init",
  address: "init1x9f...72qa",
  balance: "12,480.45 INIT",
  trust: 92,
  followers: "18.4k",
  following: "641",
  bio: "Creator, trader, and agent operator on Initia.",
  agentCap: "250 INIT/day",
}

export const navItems = [
  { id: "inbox", label: "Inbox", path: "/inbox" },
  { id: "money", label: "Money", path: "/money" },
  { id: "play", label: "Play", path: "/play" },
  { id: "explore", label: "Explore", path: "/explore" },
  { id: "profile", label: "Profile", path: "/profile" },
] as const

export const landingStats = [
  { id: "surface", label: "One surface", value: "Chat + Money + Agents" },
  { id: "identity", label: "Identity", value: ".init native" },
  { id: "rails", label: "Rails", value: "Move contracts" },
] as const

// Legacy sample threads retained only for routes that still import the old demo catalogue.
export const threads = [
  {
    id: "rio",
    name: "Rio Chen",
    handle: "rio.init",
    last: "Can you split the studio payment today?",
    unread: 2,
    kind: "DM",
    messages: [
      { id: "r1", from: "rio", text: "Can you split the studio payment between kai.init and zara.init today?", meta: "09:18" },
      { id: "r2", from: "me", text: "Yes — I can do it from the payment split flow.", meta: "09:20" },
      { id: "r3", from: "rio", text: "Perfect. Add the invoice memo so it shows in activity.", meta: "09:21" },
    ],
  },
  {
    id: "kai",
    name: "Kai Studio",
    handle: "kai.init",
    last: "Can you unlock the market memo?",
    unread: 0,
    kind: "DM",
    messages: [
      { id: "k1", from: "kai", text: "New SOL prediction memo is behind a 4 INIT paywall.", meta: "08:44" },
      { id: "k2", from: "me", text: "Send it. I can purchase from the thread.", meta: "08:47" },
    ],
  },
  {
    id: "squad",
    name: "Alpha Squad",
    handle: "alpha.squad",
    last: "Lucky pool needs two more entries.",
    unread: 5,
    kind: "Squad",
    messages: [
      { id: "s1", from: "kai", text: "Entry fee is 2 INIT. Draw at 18:00 UTC.", meta: "07:10" },
      { id: "s2", from: "me", text: "I am in. I will check the oracle prices before the draw.", meta: "07:15" },
    ],
  },
] as const

// TODO 5G: replace with agent activity feed from event listener.
export const agentActions = [
  { id: "a1", actor: "Claude Desktop · init1c1a...9mcp", action: "ori.predict", detail: "ETH 24h move checked through MCP", cap: "12/250 INIT" },
  { id: "a2", actor: "Claude Desktop · init1c1a...9mcp", action: "ori.purchase_paywall", detail: "Unlocked Kai memo", cap: "4/250 INIT" },
  { id: "a3", actor: "Claude Desktop · init1c1a...9mcp", action: "ori.send_tip", detail: "Tipped creator 3 INIT", cap: "19/250 INIT" },
] as const

// TODO 5G: replace with agent_policy.move query for the connected user.
export const authorizedAgents = [
  {
    id: "claude-desktop",
    name: "Claude Desktop",
    address: "init1c1a...9mcp",
    status: "Authorized via MCP server",
    cap: "250 INIT/day",
    methods: ["ori.send_tip", "ori.purchase_paywall", "ori.predict"],
  },
] as const

export const mcpTools = [
  "ori.send_payment",
  "ori.send_tip",
  "ori.create_link_gift",
  "ori.get_balance",
  "ori.get_profile",
  "ori.resolve_init_name",
  "ori.propose_wager",
  "ori.list_top_creators",
  "ori.purchase_paywall",
  "ori.search_initia_docs",
  "ori.fetch_initia_doc",
  "ori.schedule_action",
  "ori.predict",
] as const

// TODO 5G: replace with portfolio aggregation (balances + streams + paywalls).
export const portfolio = [
  { id: "init", asset: "INIT", value: "$18,204", amount: "12,480.45", change: "+8.2%" },
  { id: "usdc", asset: "USDC", value: "$5,120", amount: "5,120.00", change: "+0.0%" },
  { id: "streams", asset: "Streams", value: "$812", amount: "3 active", change: "+14.5%" },
  { id: "paywalls", asset: "Paywalls", value: "$2,044", amount: "41 sales", change: "+22.1%" },
] as const

// TODO 5G: replace with Slinky oracle reads.
export const oraclePrices = [
  { id: "btc", pair: "BTC/USD", price: "$102,440", move: "+2.8%" },
  { id: "eth", pair: "ETH/USD", price: "$4,820", move: "+4.1%" },
  { id: "sol", pair: "SOL/USD", price: "$238", move: "-1.4%" },
  { id: "bnb", pair: "BNB/USD", price: "$824", move: "+0.9%" },
  { id: "atom", pair: "ATOM/USD", price: "$11.24", move: "+6.0%" },
] as const

// TODO 5G: replace with discover/recent index from event listener.
export const discover = {
  recent: ["kai.init launched SOL memo", "zara.init opened a 12h stream", "alpha.squad created lucky pool"],
  topCreators: ["kai.init", "mira.init", "zara.init", "doc.init"],
  rising: ["mango.init", "byte.init", "luna.init"],
}

// TODO 5G: replace with leaderboard aggregation queries.
export const leaderboards = [
  { id: "creators", title: "Top creators", rows: ["kai.init — 1,208 sales", "mira.init — 996 sales", "zara.init — 812 sales"] },
  { id: "tippers", title: "Top tippers", rows: ["whale.init — 8,040 INIT", "patron.init — 3,400 INIT", "rio.init — 2,100 INIT"] },
  { id: "creator-tippers", title: "Creator top tippers", rows: ["for mira.init", "rio.init — 220 INIT", "ash.init — 184 INIT"] },
] as const

export const achievements = [
  { id: "first-tip", name: "First Tip", detail: "Sent a public creator tip" },
  { id: "market-maker", name: "Market Maker", detail: "Resolved a YES/NO pool" },
  { id: "trusted-agent", name: "Trusted Agent", detail: "Set a capped agent policy" },
] as const

export const quests = ["Claim seed payment", "Launch first paywall", "Invite three followers"] as const

const fields = {
  recipient: ["Recipient .init or address", "Amount", "Memo"],
  bulk: ["Recipients CSV", "Total amount", "Split rule"],
  content: ["Title", "Price", "Content link or promise"],
  wager: ["Opponent or market", "Terms", "Stake"],
  policy: ["Agent address", "Daily cap", "Allowed methods"],
  simple: ["Target .init or address", "Amount / note"],
}

export const moneyTabs = [
  {
    id: "payments",
    label: "Payments",
    summary: "Send, split, and tip from chat or profile surfaces.",
    actions: [
      { id: "send-payment", title: "Send payment", contract: "payment_router.move", fields: fields.recipient },
      { id: "bulk-send", title: "Bulk send", contract: "payment_router.move", fields: fields.bulk },
      { id: "tip-creator", title: "Tip a creator", contract: "tip_jar.move", fields: ["Creator .init", "Amount", "Public message"] },
    ],
  },
  {
    id: "gifts",
    label: "Gifts",
    summary: "Gift links, directed drops, group claims, and reusable gift boxes.",
    actions: [
      { id: "create-link-gift", title: "Create link-gift", contract: "payment_router.move", fields: ["Amount", "Expiry", "Shortcode"] },
      { id: "create-directed-gift", title: "Create directed gift", contract: "payment_router.move", fields: fields.recipient },
      { id: "create-group-gift", title: "Create group gift", contract: "payment_router.move", fields: ["Total amount", "Claim slots", "Expiry"] },
      { id: "claim-link-gift", title: "Claim link gift", contract: "gift_packet.move", fields: ["Gift ID", "Secret hex"] },
      { id: "claim-directed-gift", title: "Claim directed gift", contract: "gift_packet.move", fields: ["Gift ID"] },
      { id: "claim-group-slot", title: "Claim group gift slot", contract: "gift_group.move", fields: ["Group gift ID", "Slot index", "Secret hex"] },
      { id: "reclaim-expired-gift", title: "Reclaim expired link gift", contract: "gift_packet.move", fields: ["Gift ID"] },
      { id: "reclaim-expired-group", title: "Reclaim expired group gift", contract: "gift_group.move", fields: ["Group gift ID"] },
      { id: "register-gift-box", title: "Register gift box template", contract: "gift_box_catalog.move", fields: ["Template name", "Theme JSON", "Default amount"] },
    ],
  },
  {
    id: "streams",
    label: "Streams",
    summary: "Open per-second payments, withdraw vested funds, or close streams.",
    actions: [
      { id: "open-stream", title: "Open a stream", contract: "payment_stream.move", fields: ["Recipient .init or address", "Rate per second", "Duration seconds"] },
      { id: "withdraw-stream", title: "Withdraw vested portion", contract: "payment_stream.move", fields: ["Stream ID"] },
      { id: "close-stream", title: "Close stream", contract: "payment_stream.move", fields: ["Stream ID"] },
    ],
  },
  {
    id: "subscriptions",
    label: "Subscriptions",
    summary: "Creator plans, subscriber checkout, release cycles, and cancellation.",
    actions: [
      // Field labels match what the action handlers actually parse —
      // previously e.g. release-period asked for "Plan ID" and "Period" but
      // the handler treats those as subscriber address + creator address,
      // so any user reading the labels typed nonsense. The handler in
      // money/page.tsx is the source of truth here.
      { id: "register-plan", title: "Register subscription plan", contract: "subscription_vault.move", fields: ["Period price (INIT)", "Billing cadence (seconds)"] },
      { id: "subscribe-plan", title: "Subscribe to a creator", contract: "subscription_vault.move", fields: ["Creator .init or address", "Number of periods to pre-pay"] },
      { id: "release-period", title: "Release subscription period (creator pulls funds)", contract: "subscription_vault.move", fields: ["Subscriber .init or address"] },
      { id: "cancel-subscription", title: "Cancel subscription", contract: "subscription_vault.move", fields: ["Creator .init or address"] },
      { id: "deactivate-plan", title: "Deactivate your plan (irreversible)", contract: "subscription_vault.move", fields: [] },
    ],
  },
  {
    id: "paywalls",
    label: "Paywalls",
    summary: "Sell content promises and x402 merchant access.",
    actions: [
      { id: "create-paywall", title: "Create paywall", contract: "paywall.move", fields: fields.content },
      { id: "purchase-paywall", title: "Purchase paywall", contract: "paywall.move", fields: ["Paywall ID"] },
      { id: "deactivate-paywall", title: "Deactivate paywall", contract: "paywall.move", fields: ["Paywall ID"] },
      { id: "register-merchant", title: "Register as merchant", contract: "merchant_registry.move", fields: ["Merchant name", "Category", "Logo URL", "Contact", "Accepted denoms CSV"] },
    ],
  },
  {
    id: "sponsor",
    label: "Sponsor",
    summary: "Gas sponsorship, seed bonus, and sponsored username registration.",
    actions: [
      { id: "sponsor-status", title: "Check sponsor status", contract: "/v1/sponsor/status", fields: ["Wallet address"] },
      { id: "claim-seed", title: "Claim seed payment", contract: "/v1/sponsor/seed", fields: ["New wallet address"] },
      { id: "sponsored-username", title: "Sponsored .init registration", contract: "/v1/sponsor/username", fields: ["Desired .init", "Bio"] },
    ],
  },
] as const

export const playTabs = [
  {
    id: "wagers",
    label: "Wagers",
    summary: "Escrowed 1v1, PvP, and oracle-resolved predictions.",
    actions: [
      // Wager / market form fields are wired exactly to what the handler in
      // play/page.tsx parses. Previously the same `fields.wager` was reused
      // for several actions and the per-action handler then ignored half of
      // them — silent input loss. Each action now lists only what its
      // handler reads, with explicit USD-friendly labels.
      { id: "propose-wager", title: "Propose 1v1 wager (you arbitrate)", contract: "wager_escrow.move", fields: ["Opponent .init or address", "Terms (free text)", "Stake in INIT"] },
      { id: "propose-pvp-wager", title: "Propose PvP wager (no arbiter; auto-deadline 24h)", contract: "wager_escrow.move", fields: ["Opponent .init or address", "Terms (free text)", "Stake in INIT"] },
      { id: "accept-wager", title: "Accept a wager you've been challenged to", contract: "wager_escrow.move", fields: ["Wager ID (numeric)"] },
      { id: "resolve-wager", title: "Resolve wager (arbiter only)", contract: "wager_escrow.move", fields: ["Wager ID (numeric)", "Winner .init or address"] },
      { id: "concede-wager", title: "Concede the wager (you lose)", contract: "wager_escrow.move", fields: ["Wager ID (numeric)"] },
      { id: "cancel-pending-wager", title: "Cancel a wager nobody accepted yet", contract: "wager_escrow.move", fields: ["Wager ID (numeric)"] },
      { id: "refund-expired-wager", title: "Claim refund for expired wager", contract: "wager_escrow.move", fields: ["Wager ID (numeric)"] },
      // Oracle wagers: USD-style price label; the handler converts internally
      // using the oracle's published decimals.
      { id: "propose-oracle-resolved-wager", title: "Propose oracle-resolved wager (price-based)", contract: "wager_escrow.move", fields: ["Opponent .init or address", "Oracle pair (e.g. BTC/USD)", "Stake in INIT", "Target USD price (e.g. 100000)", "Proposer wins if price is above (true/false)"] },
      { id: "resolve-from-oracle", title: "Settle oracle wager from current price", contract: "wager_escrow.move", fields: ["Wager ID (numeric)"] },
    ],
  },
  {
    id: "markets",
    label: "Prediction markets",
    summary: "YES/NO pools, Slinky feeds, creator resolution, and winnings claims.",
    actions: [
      { id: "create-market", title: "Create prediction market", contract: "prediction_pool.move", fields: ["Oracle pair (e.g. BTC/USD)", "Target USD price", "YES wins if price is above (true/false)", "Deadline (UTC seconds)"] },
      { id: "stake-yes", title: "Stake YES on a market", contract: "prediction_pool.move", fields: ["Market ID (numeric)", "Amount in INIT"] },
      { id: "stake-no", title: "Stake NO on a market", contract: "prediction_pool.move", fields: ["Market ID (numeric)", "Amount in INIT"] },
      { id: "resolve-market", title: "Resolve market (creator only)", contract: "prediction_pool.move", fields: ["Market ID (numeric)"] },
      { id: "claim-winnings", title: "Claim your winnings", contract: "prediction_pool.move", fields: ["Market ID (numeric)"] },
    ],
  },
  {
    id: "lucky",
    label: "Lucky pools",
    summary: "Entry-fee pools with fixed participant counts and winner draws.",
    actions: [
      { id: "create-lucky-pool", title: "Create a lucky pool", contract: "lucky_pool.move", fields: ["Entry fee (INIT)", "Participants (number)", "Pool deadline (UTC seconds)"] },
      { id: "join-lucky-pool", title: "Join a pool", contract: "lucky_pool.move", fields: ["Pool ID (numeric)"] },
      { id: "draw-winner", title: "Draw winner (anyone can call after deadline)", contract: "lucky_pool.move", fields: ["Pool ID (numeric)"] },
    ],
  },
] as const

// Identity actions are split per-field rather than the previous single
// "Update bio/avatar/links" with a heuristic that misclassified bios
// containing commas as link lists. The handler in profile/page.tsx
// dispatches each id directly to the matching msg* helper.
export const profileActions = [
  {
    id: "identity",
    label: "Profile / Identity",
    actions: [
      { id: "create-profile", title: "Create profile (one-time)", contract: "profile_registry.move", fields: ["Bio (optional)", "Avatar URL (optional)"] },
      { id: "update-bio", title: "Update bio", contract: "profile_registry.move", fields: ["New bio"] },
      { id: "update-avatar", title: "Update avatar URL", contract: "profile_registry.move", fields: ["New avatar URL"] },
      { id: "update-links", title: "Update links (comma-separated URLs)", contract: "profile_registry.move", fields: ["Comma-separated URLs"] },
      { id: "set-slug", title: "Set profile slug (creator vanity)", contract: "profile_registry.move", fields: ["New slug"] },
      { id: "set-encryption-pubkey", title: "Set encryption pubkey (advanced — use 'Enable encrypted DMs' in Inbox instead)", contract: "profile_registry.move", fields: ["32-byte hex public key"] },
      { id: "update-privacy-settings", title: "Update privacy settings", contract: "profile_registry.move", fields: ["hideBalance (true/false)", "hideActivity (true/false)", "whitelistOnly (true/false)"] },
      { id: "follow-user", title: "Follow user", contract: "profile_registry.move", fields: ["Target .init or address"] },
      { id: "unfollow-user", title: "Unfollow user", contract: "profile_registry.move", fields: ["Target .init or address"] },
    ],
  },
  {
    id: "reputation",
    label: "Reputation",
    actions: ["Thumbs up", "Thumbs down", "Retract vote", "Attest signed claim"].map((title) => ({ id: title.toLowerCase().replaceAll(" ", "-"), title, contract: "reputation.move", fields: ["Target .init", "Claim or vote reason"] })),
  },
  {
    id: "agent-policy",
    label: "Agent policy",
    actions: [
      { id: "set-agent-policy", title: "Set agent spending policy", contract: "agent_policy.move", fields: fields.policy },
      { id: "revoke-agent", title: "Revoke agent", contract: "agent_policy.move", fields: ["Agent address", "Reason"] },
    ],
  },
  {
    id: "settings",
    label: "Settings",
    actions: [
      { id: "push-subscribe", title: "Register PWA push", contract: "/v1/push/subscribe", fields: ["Device label", "Notification scope"] },
      { id: "push-delete", title: "Delete PWA push", contract: "DELETE /v1/push/subscribe", fields: ["Device ID"] },
      { id: "agent-card", title: "View A2A agent card", contract: "/.well-known/agent.json", fields: ["Agent domain"] },
    ],
  },
] as const
