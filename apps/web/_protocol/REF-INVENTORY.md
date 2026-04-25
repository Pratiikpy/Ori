# REF-INVENTORY

Source: `C:\Users\prate\Downloads\ui-ref-orii`

## Pages (`frontend/src/pages/`)
| File | Route in CRA SPA | Content |
|---|---|---|
| Landing.jsx | `/` | hero + feature grid + login CTAs (5) |
| Inbox.jsx | `/app/inbox` | 3-col: thread list / message panel / agent panel (MCP control room + agent actions tabs) |
| Money.jsx | `/app/money` | balance card (black), agent budget, gift visual, portfolio grid (4), tabs: payments/gifts/streams/subscriptions/paywalls/sponsor |
| Play.jsx | `/app/play` | intro card + slinky live oracle (top 3) + tabs: wagers / prediction markets / lucky pools |
| Explore.jsx | `/app/explore` | discover grid (recent / topCreators / rising) + tabs: leaderboards / oracle prices / activity / squads |
| Profile.jsx | `/app/profile` | identity card + agent policy card (slider + privacy + authorized agents) + 4 secondary cards (achievements / quests / merchant links / notifications) + tabs: identity / reputation / agent-policy / settings |

## Shared components (`frontend/src/components/`)
| File | Purpose |
|---|---|
| OriShell.jsx | sidebar + topbar + mobile bottom nav, wraps inner pages |
| ActionDialog.jsx | ActionDialog modal + ActionCard (used by every action grid) |
| ui/* | 40+ shadcn primitives (already mirrored in apps/web/src/components/ui) |

## Static design data (`frontend/src/data/oriData.js`)
- `media.{hero,grid,agent,gift}` — external CDN URLs
- `currentUser` — Mira mock identity
- `navItems` — 5 nav rows (inbox, money, play, explore, profile)
- `landingStats`, `threads`, `agentActions`, `authorizedAgents`, `mcpTools`, `portfolio`, `oraclePrices`, `discover`, `leaderboards`, `achievements`, `quests`, `moneyTabs`, `playTabs`, `profileActions`

## Visual system
- **Color**: white bg `#FFFFFF`, ink `#0A0A0A`, accent `#0022FF` (electric blue), surface tint `#F5F5F5`, muted text `#52525B`, success `#00C566`/`#00A858`, danger `#FF3B30`, gold `#FFB800`. All `rounded-none`. Brutalist 1px borders `border-black/10`. Action cards use `shadow-[4px_4px_0px_0px_rgba(0,34,255,1)]` accent shadow on hover.
- **Type**: Cabinet Grotesk (heading), IBM Plex Sans (body), JetBrains Mono (numbers/handles). In our port substituted with Manrope (Cabinet Grotesk closest Google match) until self-hosted woff2 lands.
- **Animation**: framer-motion fade+rise on hero + cards. Stripped in our port (Server Component constraint on Landing); restored on client pages possible.
- **Responsive**: 1col mobile / 2-3 col tablet / 5 col grids on lg. OriShell sidebar hidden < lg, replaced with bottom nav.
