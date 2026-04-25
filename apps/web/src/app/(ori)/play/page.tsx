'use client'

/**
 * Play page — wired to live Slinky oracle reads + on-chain wager / prediction
 * market / lucky pool transactions.
 *
 * Visual layout preserved from ui-ref-orii/frontend/src/pages/Play.jsx.
 *
 * Wiring:
 *   - Top-3 oracle card → `useOraclePrices(['BTC/USD','ETH/USD','SOL/USD'])`
 *     + `formatOraclePrice`. The /v1/oracle/price proxy doesn't return a delta,
 *     so we render a static "Slinky live" chip in green instead of "+x.x%".
 *   - Wagers (9) → `msgPropose*`, `msgAcceptWager`, `msgResolveWager`,
 *     `msgConcedeWager`, `msgCancelPendingWager`, `msgRefundExpiredWager`,
 *     `msgProposeOracleWager`, `msgResolveFromOracle`.
 *   - Prediction markets (5) → `msgCreatePredictionMarket`,
 *     `msgStakePrediction`, `msgResolvePrediction`,
 *     `msgClaimPredictionWinnings`. `predict-price` is STUBBED.
 *   - Lucky pools (3) → `msgCreateLuckyPool`, `msgJoinLuckyPool`,
 *     `msgDrawLuckyPool`.
 *
 * Submission path: every message is sent via `sendTx` with the auto-sign
 * branch chosen by `useAutoSign()` — same pattern as squads/page.tsx.
 *
 * Field-parsing gaps are documented in _protocol/verify/Play.md. The
 * ActionDialog form fields ("Opponent or market", "Terms", "Stake", etc.) are
 * generic and don't map cleanly to richer helper signatures (arbiter,
 * targetPrice, comparator, deadline). Sane defaults are filled in and the
 * gaps are listed in the verify file.
 */
import { useCallback, useState } from 'react'
import { Trophy } from 'lucide-react'
import { toast } from 'sonner'
import { useInterwovenKit } from '@initia/interwovenkit-react'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ActionCard,
  ActionDialog,
  type Action,
  type ActionRecord,
} from '@/components/action-dialog'
import { playTabs } from '@/data/ori-data'
import { useAutoSign } from '@/hooks/use-auto-sign'
import { useOraclePrices } from '@/hooks/use-oracle'
import { formatOraclePrice } from '@/lib/api-oracle'
import { ORI_CHAIN_ID, ORI_DECIMALS } from '@/lib/chain-config'
import {
  msgAcceptWager,
  msgCancelPendingWager,
  msgClaimPredictionWinnings,
  msgConcedeWager,
  msgCreateLuckyPool,
  msgCreatePredictionMarket,
  msgDrawLuckyPool,
  msgJoinLuckyPool,
  msgProposeOracleWager,
  msgProposePvpWager,
  msgProposeWager,
  msgRefundExpiredWager,
  msgResolveFromOracle,
  msgResolvePrediction,
  msgResolveWager,
  msgStakePrediction,
} from '@/lib/contracts'
import { buildAutoSignFee, friendlyError, sendTx } from '@/lib/tx'

const ORACLE_PAIRS = ['BTC/USD', 'ETH/USD', 'SOL/USD'] as const

type EncodeObject = { typeUrl: string; value: unknown }

/** "1.5" → 1500000n at 6 decimals. Empty/invalid → 0n. */
function parseAmountToBase(s: string | undefined): bigint {
  if (!s) return 0n
  const cleaned = s.replace(/[^0-9.]/g, '')
  if (!cleaned) return 0n
  const [whole, fracRaw = ''] = cleaned.split('.')
  const frac = (fracRaw + '0'.repeat(ORI_DECIMALS)).slice(0, ORI_DECIMALS)
  return (
    BigInt(whole || '0') * 10n ** BigInt(ORI_DECIMALS) + BigInt(frac || '0')
  )
}

/** Strip "#" and non-digits → bigint. Throws on empty. */
function parseId(s: string | undefined): bigint {
  const cleaned = (s ?? '').trim().replace(/^#/, '').replace(/[^0-9]/g, '')
  if (!cleaned) throw new Error('Numeric ID required')
  return BigInt(cleaned)
}

/** Default 24h horizon for actions whose form omits a deadline field. */
function defaultDeadlineSecondsFromNow(): bigint {
  return BigInt(Math.floor(Date.now() / 1000) + 24 * 3600)
}

export default function PlayPage() {
  const kit = useInterwovenKit()
  const { initiaAddress, isConnected, openConnect } = kit
  const { isEnabled: autoSign } = useAutoSign()

  const [modalAction, setModalAction] = useState<Action | null>(null)
  const [recentAction, setRecentAction] = useState<ActionRecord | null>(null)

  // Live oracle reads — top 3 pairs.
  const oracle = useOraclePrices([...ORACLE_PAIRS])

  /**
   * action.id → handler returning a MsgExecute (or `null` to abort with toast).
   * Each handler reads from `values` (form input record from ActionDialog).
   * Defined inside the component so we can close over `initiaAddress`.
   */
  const buildMessage = useCallback(
    (
      actionId: string,
      values: Record<string, string>,
    ): { msg: EncodeObject; gas: number } | null => {
      if (!initiaAddress) {
        toast.error('Connect wallet first')
        return null
      }

      try {
        switch (actionId) {
          // ---------------- Wagers ----------------
          case 'propose-wager': {
            const accepter = (values['Opponent or market'] ?? '').trim()
            const claim = (values['Terms'] ?? '').trim()
            const amount = parseAmountToBase(values['Stake'])
            if (!accepter) throw new Error('Opponent address required')
            if (!claim) throw new Error('Terms required')
            if (amount <= 0n) throw new Error('Stake required')
            return {
              msg: msgProposeWager({
                proposer: initiaAddress,
                accepter,
                arbiter: initiaAddress, // GAP: form has no arbiter field; default to self
                amount,
                claim,
              }),
              gas: 600_000,
            }
          }
          case 'propose-pvp-wager': {
            const accepter = (values['Opponent or market'] ?? '').trim()
            const claim = (values['Terms'] ?? '').trim()
            const amount = parseAmountToBase(values['Stake'])
            if (!accepter) throw new Error('Opponent address required')
            if (!claim) throw new Error('Terms required')
            if (amount <= 0n) throw new Error('Stake required')
            return {
              msg: msgProposePvpWager({
                proposer: initiaAddress,
                accepter,
                amount,
                claim,
                category: 'general', // GAP: no category field
                deadlineSeconds: defaultDeadlineSecondsFromNow(), // GAP: no deadline field
              }),
              gas: 600_000,
            }
          }
          case 'accept-wager': {
            // GAP: "Opponent or market" repurposed as wager id
            const wagerId = parseId(values['Opponent or market'])
            return {
              msg: msgAcceptWager({ accepter: initiaAddress, wagerId }),
              gas: 500_000,
            }
          }
          case 'resolve-wager': {
            // GAP: "Opponent or market" → wagerId, "Terms" → winner address
            const wagerId = parseId(values['Opponent or market'])
            const winner = (values['Terms'] ?? '').trim()
            if (!winner) throw new Error('Winner address required (Terms field)')
            return {
              msg: msgResolveWager({
                arbiter: initiaAddress,
                wagerId,
                winner,
              }),
              gas: 600_000,
            }
          }
          case 'concede-wager': {
            const wagerId = parseId(values['Opponent or market'])
            return {
              msg: msgConcedeWager({ loser: initiaAddress, wagerId }),
              gas: 500_000,
            }
          }
          case 'cancel-pending-wager': {
            const wagerId = parseId(values['Opponent or market'])
            return {
              msg: msgCancelPendingWager({
                proposer: initiaAddress,
                wagerId,
              }),
              gas: 500_000,
            }
          }
          case 'refund-expired-wager': {
            const wagerId = parseId(values['Opponent or market'])
            return {
              msg: msgRefundExpiredWager({
                caller: initiaAddress,
                wagerId,
              }),
              gas: 500_000,
            }
          }
          case 'propose-oracle-resolved-wager': {
            // GAP: "Terms" repurposed as oraclePair (e.g. "BTC/USD")
            // GAP: targetPrice/comparator/category not in form — sensible defaults
            const accepter = (values['Opponent or market'] ?? '').trim()
            const oraclePair = (values['Terms'] ?? '').trim() || 'BTC/USD'
            const amount = parseAmountToBase(values['Stake'])
            if (!accepter) throw new Error('Opponent address required')
            if (amount <= 0n) throw new Error('Stake required')
            return {
              msg: msgProposeOracleWager({
                proposer: initiaAddress,
                accepter,
                amount,
                claim: `${oraclePair} oracle wager`,
                category: 'oracle',
                deadlineSeconds: defaultDeadlineSecondsFromNow(),
                oraclePair,
                targetPrice: 0n, // GAP: no target-price field — UI placeholder
                proposerWinsAbove: true, // GAP: no comparator field
              }),
              gas: 700_000,
            }
          }
          case 'resolve-from-oracle': {
            const wagerId = parseId(values['Opponent or market'])
            return {
              msg: msgResolveFromOracle({
                caller: initiaAddress,
                wagerId,
              }),
              gas: 600_000,
            }
          }

          // ---------------- Prediction markets ----------------
          case 'create-market': {
            // GAP: "Question" not used by helper. "Resolution source" → oraclePair.
            // GAP: targetPrice/comparator not in form — defaults applied.
            const oraclePair =
              (values['Resolution source'] ?? '').trim() || 'BTC/USD'
            const deadlineRaw = (values['Deadline'] ?? '').trim()
            const deadlineSeconds =
              deadlineRaw && /^\d+$/.test(deadlineRaw)
                ? BigInt(deadlineRaw)
                : defaultDeadlineSecondsFromNow()
            return {
              msg: msgCreatePredictionMarket({
                sender: initiaAddress,
                oraclePair,
                targetPrice: 0n, // GAP
                comparator: true, // GAP
                deadlineSeconds,
              }),
              gas: 700_000,
            }
          }
          case 'stake-yes': {
            const marketId = parseId(values['Market ID'])
            const amount = parseAmountToBase(values['Amount'])
            if (amount <= 0n) throw new Error('Amount required')
            return {
              msg: msgStakePrediction({
                sender: initiaAddress,
                marketId,
                sideYes: true,
                amount,
              }),
              gas: 600_000,
            }
          }
          case 'stake-no': {
            const marketId = parseId(values['Market ID'])
            const amount = parseAmountToBase(values['Amount'])
            if (amount <= 0n) throw new Error('Amount required')
            return {
              msg: msgStakePrediction({
                sender: initiaAddress,
                marketId,
                sideYes: false,
                amount,
              }),
              gas: 600_000,
            }
          }
          case 'resolve-market': {
            // GAP: "Outcome" field unused; resolution reads oracle on-chain.
            const marketId = parseId(values['Market ID'])
            return {
              msg: msgResolvePrediction({
                sender: initiaAddress,
                marketId,
              }),
              gas: 600_000,
            }
          }
          case 'claim-winnings': {
            // GAP: "Claim address" unused; sender always claims own winnings.
            const marketId = parseId(values['Market ID'])
            return {
              msg: msgClaimPredictionWinnings({
                sender: initiaAddress,
                marketId,
              }),
              gas: 500_000,
            }
          }

          // ---------------- Lucky pools ----------------
          case 'create-lucky-pool': {
            // GAP: "Draw time" field has no helper equivalent.
            const entryFee = parseAmountToBase(values['Entry fee'])
            const partsRaw = (values['Participants'] ?? '').trim()
            if (entryFee <= 0n) throw new Error('Entry fee required')
            if (!/^\d+$/.test(partsRaw))
              throw new Error('Participants must be a number')
            return {
              msg: msgCreateLuckyPool({
                creator: initiaAddress,
                entryFee,
                maxParticipants: BigInt(partsRaw),
              }),
              gas: 600_000,
            }
          }
          case 'join-lucky-pool': {
            // GAP: "Entry wallet" unused; sender is always the joiner.
            const poolId = parseId(values['Pool ID'])
            return {
              msg: msgJoinLuckyPool({
                participant: initiaAddress,
                poolId,
              }),
              gas: 500_000,
            }
          }
          case 'draw-winner': {
            // GAP: "Randomness proof" unused; module supplies its own randomness.
            const poolId = parseId(values['Pool ID'])
            return {
              msg: msgDrawLuckyPool({
                caller: initiaAddress,
                poolId,
              }),
              gas: 600_000,
            }
          }

          default:
            return null
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Invalid input')
        return null
      }
    },
    [initiaAddress],
  )

  /**
   * Called after ActionDialog finishes its built-in form submit. We route to
   * a real on-chain tx (or stub toast for predict-price).
   */
  const handleActionComplete = useCallback(
    async (record: ActionRecord) => {
      // Always set the recentAction toast row first (preserves UI behaviour).
      setRecentAction(record)

      // STUB: AI predict — no contract msg.
      if (record.id === 'predict-price') {
        toast.message('Coming soon — AI predict via MCP')
        return
      }

      if (!isConnected) {
        openConnect()
        return
      }
      if (!initiaAddress) return

      const built = buildMessage(record.id, record.values)
      if (!built) return

      try {
        await sendTx(kit, {
          chainId: ORI_CHAIN_ID,
          messages: [built.msg],
          autoSign,
          fee: autoSign ? buildAutoSignFee(built.gas) : undefined,
        })
        toast.success(`${record.title} submitted`)
      } catch (err) {
        toast.error(friendlyError(err))
      }
    },
    [autoSign, buildMessage, initiaAddress, isConnected, kit, openConnect],
  )

  return (
    <section className="p-4 sm:p-6 lg:p-8" data-testid="play-page">
      <div
        className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_0.6fr]"
        data-testid="play-header-grid"
      >
        <div
          className="border border-black/10 bg-[#F5F5F5] p-6"
          data-testid="play-intro-card"
        >
          <p
            className="text-xs font-bold uppercase tracking-[0.2em] text-[#52525B]"
            data-testid="play-intro-overline"
          >
            Outcome markets
          </p>
          <h2
            className="mt-3 font-heading text-4xl font-black tracking-tight"
            data-testid="play-intro-title"
          >
            Bet, predict, pool, resolve, and claim winnings.
          </h2>
          <p
            className="mt-4 max-w-3xl text-sm leading-6 text-[#52525B]"
            data-testid="play-intro-copy"
          >
            Every wager, prediction market, and lucky pool action is represented as a simulated transaction flow ready for contract integration.
          </p>
        </div>
        <div
          className="border border-black/10 bg-black p-6 text-white"
          data-testid="play-live-oracle-card"
        >
          <Trophy className="h-7 w-7 text-[#FFB800]" />
          <p
            className="mt-5 text-xs font-bold uppercase tracking-[0.2em] text-white/60"
            data-testid="play-oracle-label"
          >
            Slinky pairs
          </p>
          <div className="mt-4 space-y-2" data-testid="play-oracle-list">
            {ORACLE_PAIRS.map((pair, i) => {
              const symbolRoot = pair.split('/')[0] ?? pair
              const id = symbolRoot.toLowerCase()
              const q = oracle[i]
              const symbol = `${symbolRoot}/USD`
              let priceNode: React.ReactNode
              let moveNode: React.ReactNode
              if (q?.isLoading) {
                priceNode = (
                  <span
                    className="inline-block h-3 w-16 animate-pulse bg-white/20"
                    aria-hidden
                  />
                )
                moveNode = null
              } else if (q?.isError || !q?.data) {
                priceNode = <span className="text-white/40">—</span>
                moveNode = null
              } else {
                priceNode = formatOraclePrice(q.data)
                // The /v1/oracle/price proxy doesn't return a delta; chip
                // "Slinky live" in green to signal the feed is live.
                moveNode = (
                  <span
                    className="ml-3 text-[10px] uppercase tracking-[0.18em] text-[#00C566]"
                    data-testid={`play-oracle-move-${id}`}
                  >
                    Slinky live
                  </span>
                )
              }
              return (
                <div
                  key={id}
                  className="flex items-center justify-between font-mono text-sm"
                  data-testid={`play-oracle-${id}`}
                >
                  <span data-testid={`play-oracle-pair-${id}`}>{symbol}</span>
                  <span
                    className="flex items-center text-[#00C566]"
                    data-testid={`play-oracle-price-${id}`}
                  >
                    {priceNode}
                    {moveNode}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <Tabs defaultValue="wagers" className="mt-8" data-testid="play-tabs">
        <TabsList
          className="flex h-auto w-full flex-wrap justify-start rounded-none border border-black/10 bg-white p-0"
          data-testid="play-tabs-list"
        >
          {playTabs.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="rounded-none border-r border-black/10 px-4 py-3 data-[state=active]:bg-[#0022FF] data-[state=active]:text-white"
              data-testid={`play-tab-${tab.id}`}
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {playTabs.map((tab) => (
          <TabsContent
            key={tab.id}
            value={tab.id}
            className="mt-4"
            data-testid={`play-tab-content-${tab.id}`}
          >
            <div
              className="mb-4 border border-black/10 bg-white p-5"
              data-testid={`play-tab-summary-${tab.id}`}
            >
              <p
                className="text-xs font-bold uppercase tracking-[0.2em] text-[#52525B]"
                data-testid={`play-tab-label-${tab.id}`}
              >
                {tab.label}
              </p>
              <h2
                className="mt-2 font-heading text-3xl font-black tracking-tight"
                data-testid={`play-tab-title-${tab.id}`}
              >
                {tab.summary}
              </h2>
            </div>
            <div
              className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
              data-testid={`play-actions-grid-${tab.id}`}
            >
              {tab.actions.map((action) => (
                <ActionCard
                  key={action.id}
                  scope={`play-${tab.id}`}
                  action={action as Action}
                  onOpen={setModalAction}
                />
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
      {recentAction && (
        <div
          className="mt-6 border border-[#0022FF] p-4 font-mono text-sm text-[#0022FF]"
          data-testid="play-recent-action"
        >
          {recentAction.title} simulated at {recentAction.time}
        </div>
      )}
      <ActionDialog
        action={modalAction}
        onClose={() => setModalAction(null)}
        onComplete={handleActionComplete}
      />
    </section>
  )
}
