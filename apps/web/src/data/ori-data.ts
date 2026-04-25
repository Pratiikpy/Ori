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

// TODO 5G: replace mock threads with the encrypted DM fetcher (lib/api).
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
