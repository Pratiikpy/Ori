# Money — verify

Page: `apps/web/src/app/(ori)/money/page.tsx`
Reference: `ui-ref-orii/frontend/src/pages/Money.jsx`

Visual layout preserved 1:1: overview grid (balance + agent cap + gift visual), portfolio grid (4 tiles), tabs with summary header + ActionCard grid, recent-action floater, ActionDialog modal.

## Row coverage

| Section | Decision | How |
|---|---|---|
| Total wallet balance card | STUB | Renders `truncAddr(initiaAddress)` (or "Connect wallet" + connect button when disconnected). Chip `Balance live soon` top-right. No balance fetcher in lib yet. |
| Agent daily cap card | STUB | Visual preserved, value `250 INIT`, progress fixed at 38. Chip `Coming soon` top-right. |
| Gift visual card | KEEP | Decorative `media.gift` image, unchanged. |
| Portfolio grid (4 tiles) | WIRE | `usePortfolio(initiaAddress)`. Loading → 4 skeleton tiles. Loaded → tiles derived from `stats.*`: Payments / Tips / Gifts / Social. `formatINIT(stats.tipsReceivedVolume)` divides by `10**ORI_DECIMALS`. |
| Tab: Payments | WIRE | All 3 actions routed via `handleComplete` → `msgSendPayment` / `msgBatchSend` / `msgTip` + `sendTx(kit, …)` with `useAutoSign`. |
| Tab: Gifts | WIRE | All 7 actions routed → `msgCreateLinkGift` / `msgCreateDirectedGift` / `msgCreateGroupGift` / `msgClaimLinkGift` / `msgClaimDirectedGift` / `msgReclaimExpiredGift` / `msgRegisterGiftBox`. Secrets generated client-side via `randomBytes`+`sha256`. |
| Tab: Streams | STUB | `[Coming soon]` chip on tab summary. All 3 cards toast "Coming soon — module wiring pending." (action ids in `COMING_SOON_IDS`). |
| Tab: Subscriptions | WIRE (4 of 5) | `register-plan` / `subscribe-plan` / `release-period` / `deactivate-plan` wired to msg helpers. `cancel-subscription` STUB → "Coming soon" toast. |
| Tab: Paywalls | STUB | `[Coming soon]` chip on tab summary. All 4 cards toast "Coming soon" (in `COMING_SOON_IDS`). |
| Tab: Sponsor | WIRE | All 3 actions inline-fetch `/v1/sponsor/status`, `/v1/sponsor/seed`, `/v1/sponsor/username` (no lib helper added in this run). |

## action.id → handler mapping

| action.id | tab | handler | helper / endpoint |
|---|---|---|---|
| `send-payment` | payments | WIRE | `msgSendPayment` (resolves recipient via `resolve()`, derives chatId via `deriveChatId`) |
| `bulk-send` | payments | WIRE | `msgBatchSend` (parses CSV; falls back to even split when amount column blank) |
| `tip-creator` | payments | WIRE | `msgTip` |
| `create-link-gift` | gifts | WIRE | `msgCreateLinkGift` (generates 32-byte secret + sha256 hash) |
| `create-directed-gift` | gifts | WIRE | `msgCreateDirectedGift` |
| `create-group-gift` | gifts | WIRE | `msgCreateGroupGift` (generates one secret per slot) |
| `claim-link-gift` | gifts | WIRE | `msgClaimLinkGift` (form: shortcode = giftId, claim addr field = hex secret) |
| `claim-directed-group-gift` | gifts | WIRE | `msgClaimDirectedGift` |
| `reclaim-expired-gifts` | gifts | WIRE | `msgReclaimExpiredGift` |
| `register-gift-box` | gifts | WIRE | `msgRegisterGiftBox` |
| `open-stream` | streams | STUB toast | none — payment_stream wiring pending |
| `withdraw-stream` | streams | STUB toast | none |
| `close-stream` | streams | STUB toast | none |
| `register-plan` | subscriptions | WIRE | `msgRegisterSubscriptionPlan` (cadence parsed: weekly/monthly/quarterly/daily or raw seconds) |
| `subscribe-plan` | subscriptions | WIRE | `msgSubscribe` (Plan ID slot → period count) |
| `release-period` | subscriptions | WIRE | `msgReleaseSubscriptionPeriod` (Plan ID = subscriber addr, Period = creator addr) |
| `cancel-subscription` | subscriptions | STUB toast | helper missing |
| `deactivate-plan` | subscriptions | WIRE | `msgDeactivateSubscriptionPlan` |
| `create-paywall` | paywalls | STUB toast | none in this run |
| `purchase-paywall` | paywalls | STUB toast | none |
| `deactivate-paywall` | paywalls | STUB toast | none |
| `register-merchant` | paywalls | STUB toast | none |
| `sponsor-status` | sponsor | WIRE | `GET /v1/sponsor/status?address=…` |
| `claim-seed` | sponsor | WIRE | `POST /v1/sponsor/seed` JSON body |
| `sponsored-username` | sponsor | WIRE | `POST /v1/sponsor/username` JSON body |

## Constraints

- `'use client'` retained.
- Only file modified: `apps/web/src/app/(ori)/money/page.tsx`.
- Mock-data imports `currentUser` and `portfolio` removed; `media` and `moneyTabs` kept.
- `useInterwovenKit().initiaAddress` and `isConnected` drive balance card + msg dispatch.
- ActionDialog itself untouched — submission is intercepted via the `onComplete` wrapper that routes by `action.id`.

## Typecheck

`apps/web> npx tsc --noEmit` produces no errors for this file. The single residual reference (`/.next/types/validator.ts ... money/page.js`) is a stale Next type-validator entry under the legacy non-grouped route name and is independent of this change.
