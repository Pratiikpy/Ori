'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useInterwovenKit } from '@initia/interwovenkit-react'
import { TrendingUp, TrendingDown, Loader2, Info } from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import { PageHeader, Serif } from '@/components/page-header'
import { Card, Chip } from '@/components/ui'
import { ORI_CHAIN_ID, GAS_LIMITS, POLL_INTERVALS } from '@/lib/chain-config'
import { getOraclePrice, type OraclePrice } from '@/lib/api'
import {
  msgClaimPredictionWinnings,
  msgCreatePredictionMarket,
  msgResolvePrediction,
  msgStakePrediction,
} from '@/lib/contracts'
import { buildAutoSignFee, extractMoveEventData, friendlyError, sendTx } from '@/lib/tx'
import { toast } from 'sonner'
import { useAutoSign } from '@/hooks/use-auto-sign'
import { haptic } from '@/lib/haptics'

// Preset tokens — famous pairs actually tracked by the ori-1 rollup's Connect
// oracle executor. Full list returnable from /v1/oracle/tickers; we surface the
// top-recognition ones here. Verified live 2026-04-18:
// APT, ARB, ATOM, BERA, BNB, BTC, ENA, ETH, NTRN, OSMO, SOL, SUI, TIA, USDC, USDT.
// INIT/USD and DOGE/USD are on initiation-2 L1 but NOT yet relayed to ori-1.
const TOKENS = ['BTC', 'ETH', 'SOL', 'BNB', 'ATOM'] as const

const DURATIONS: Array<{ label: string; seconds: number }> = [
  { label: '60s', seconds: 60 },
  { label: '5 min', seconds: 300 },
  { label: '1 hr', seconds: 3600 },
  { label: '1 day', seconds: 86400 },
]

const AMOUNT_PRESETS = ['0.1', '0.5', '1', '5'] as const

/**
 * Convert decimal string ("0.5") to base units (bigint) matching ORI_DENOM's
 * 6 decimals. Mirrors toBaseUnits in apps/mcp-server.
 */
function toBaseUnits(decimal: string, decimals = 6): bigint {
  const [whole, fracRaw = ''] = decimal.split('.') as [string, string?]
  const frac = (fracRaw + '0'.repeat(decimals)).slice(0, decimals)
  return BigInt(whole || '0') * 10n ** BigInt(decimals) + BigInt(frac || '0')
}

/**
 * Validate and normalize an amount string: max one decimal point, up to 6
 * places, no leading zeros other than "0.". Strips the obvious garbage
 * before it reaches the contract.
 */
function sanitizeAmount(raw: string): string {
  const cleaned = raw.replace(/[^0-9.]/g, '')
  const parts = cleaned.split('.')
  if (parts.length <= 1) return cleaned
  return parts[0] + '.' + parts.slice(1).join('').slice(0, 6)
}

function formatDisplayPrice(raw: string, decimals: number): string {
  if (decimals <= 0) return raw
  const n = Number(raw) / 10 ** decimals
  if (n >= 1000) return n.toFixed(2)
  if (n >= 1) return n.toFixed(4)
  return n.toFixed(Math.min(8, decimals))
}

export default function PredictPage() {
  const kit = useInterwovenKit()
  const { isEnabled: autoSign } = useAutoSign()

  const [selectedToken, setSelectedToken] = useState<string>('BTC')
  const [duration, setDuration] = useState<number>(60)
  const [amount, setAmount] = useState<string>('0.1')
  const [livePrice, setLivePrice] = useState<OraclePrice | null>(null)
  const [priceLoading, setPriceLoading] = useState(false)
  const [priceError, setPriceError] = useState<string | null>(null)
  const [busy, setBusy] = useState<'higher' | 'lower' | null>(null)
  const [lastResult, setLastResult] = useState<{
    marketId: string
    createTx: string
    stakeTx: string
    direction: 'higher' | 'lower'
    token: string
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const pair = `${selectedToken}/USD`

  // Poll live price every 2s while a token is selected.
  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null

    async function fetchLoop() {
      if (cancelled) return
      setPriceLoading(true)
      try {
        const p = await getOraclePrice(pair)
        if (!cancelled) {
          setLivePrice(p)
          setPriceError(null)
        }
      } catch (err) {
        if (!cancelled) {
          setPriceError(err instanceof Error ? err.message : 'oracle error')
        }
      } finally {
        if (!cancelled) {
          setPriceLoading(false)
          timer = setTimeout(fetchLoop, POLL_INTERVALS.oraclePrice)
        }
      }
    }

    fetchLoop()
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [pair])

  const displayPrice = useMemo(() => {
    if (!livePrice) return '—'
    return `$${formatDisplayPrice(livePrice.price, livePrice.decimals)}`
  }, [livePrice])

  const handlePredict = useCallback(
    async (direction: 'higher' | 'lower') => {
      setError(null)
      setLastResult(null)

      if (!kit.initiaAddress) {
        setError('Connect your wallet first.')
        return
      }
      if (!livePrice) {
        setError('Oracle price not loaded yet — try again in a moment.')
        return
      }
      const amountBase = toBaseUnits(amount)
      if (amountBase === 0n) {
        setError('Amount must be greater than 0.')
        return
      }

      setBusy(direction)
      haptic('tap')

      try {
        // 1) Create the market. Target = current oracle price (raw integer).
        const comparator = direction === 'higher'
        const createMsg = msgCreatePredictionMarket({
          sender: kit.initiaAddress,
          oraclePair: pair,
          targetPrice: BigInt(livePrice.price),
          comparator,
          deadlineSeconds: BigInt(duration),
        })

        const createRes = await sendTx(kit, {
          chainId: ORI_CHAIN_ID,
          messages: [createMsg],
          autoSign,
          fee: autoSign ? buildAutoSignFee(GAS_LIMITS.mediumTx) : undefined,
          memo: `ori predict ${pair} ${direction}`,
        })

        // Extract market_id from MarketCreated event. Fallback = parse tx response
        // OR query total_markets view if event parsing fails.
        const eventData = extractMoveEventData(
          createRes.rawResponse,
          'prediction_pool::MarketCreated',
        )
        const marketIdStr = eventData && typeof eventData.id !== 'undefined'
          ? String(eventData.id)
          : null
        if (!marketIdStr) {
          throw new Error(
            'Market created but id not in events. Check tx ' +
              createRes.txHash +
              ' manually.',
          )
        }
        const marketId = BigInt(marketIdStr)

        // 2) Stake on the creator's chosen side (YES == our direction).
        const stakeMsg = msgStakePrediction({
          sender: kit.initiaAddress,
          marketId,
          sideYes: true,
          amount: amountBase,
        })
        const stakeRes = await sendTx(kit, {
          chainId: ORI_CHAIN_ID,
          messages: [stakeMsg],
          autoSign,
          fee: autoSign ? buildAutoSignFee(GAS_LIMITS.simpleTx) : undefined,
          memo: `ori predict #${marketIdStr} stake`,
        })

        setLastResult({
          marketId: marketIdStr,
          createTx: createRes.txHash,
          stakeTx: stakeRes.txHash,
          direction,
          token: selectedToken,
        })
        toast.success(`Market #${marketIdStr} opened on ${selectedToken}/USD`)
      } catch (err) {
        const msg = friendlyError(err)
        setError(msg)
        toast.error(msg)
      } finally {
        setBusy(null)
      }
    },
    [amount, autoSign, duration, kit, livePrice, pair, selectedToken],
  )

  // Resolve + Claim helpers for power users who know their market id.
  // (Expected to be surfaced in a list view later; for now a direct input
  // is the shortest path to a complete market lifecycle in the UI.)
  const [manualMarketId, setManualMarketId] = useState<string>('')
  const [manualBusy, setManualBusy] = useState<'resolve' | 'claim' | null>(null)

  const handleManualAction = useCallback(
    async (kind: 'resolve' | 'claim') => {
      if (!kit.initiaAddress) {
        toast.error('Connect your wallet first.')
        return
      }
      const idTrimmed = manualMarketId.trim()
      if (!/^\d+$/.test(idTrimmed)) {
        toast.error('Enter a numeric market id.')
        return
      }
      const marketId = BigInt(idTrimmed)
      setManualBusy(kind)
      try {
        const msg =
          kind === 'resolve'
            ? msgResolvePrediction({ sender: kit.initiaAddress, marketId })
            : msgClaimPredictionWinnings({ sender: kit.initiaAddress, marketId })
        const res = await sendTx(kit, {
          chainId: ORI_CHAIN_ID,
          messages: [msg],
          autoSign,
          fee: autoSign ? buildAutoSignFee(GAS_LIMITS.simpleTx) : undefined,
          memo: `ori predict ${kind} #${idTrimmed}`,
        })
        toast.success(
          kind === 'resolve'
            ? `Resolved market #${idTrimmed} · ${res.txHash.slice(0, 10)}…`
            : `Claimed winnings for #${idTrimmed}`,
        )
      } catch (err) {
        toast.error(friendlyError(err))
      } finally {
        setManualBusy(null)
      }
    },
    [autoSign, kit, manualMarketId],
  )

  return (
    <AppShell title="Predict">
      <div className="px-5 pt-8 pb-6 max-w-lg mx-auto w-full space-y-6">
        <PageHeader
          kicker="02 · Predict"
          title={
            <>
              <Serif>Higher</Serif> or <Serif>lower</Serif>?
            </>
          }
          sub="Parimutuel pools on 15 famous tokens. No counterparty needed — winners split the losers' pool. Settled by Connect oracle. No liquidation."
        />

        {/* Auto-sign status banner */}
        {!autoSign && (
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-500 p-3 text-xs leading-relaxed">
            <strong className="font-semibold">Auto-sign is off.</strong>{' '}
            Each prediction opens a wallet confirmation (two signatures: create +
            stake). Enable auto-sign in the header for 1-tap mode.
          </div>
        )}

        {/* Token picker */}
        <section>
          <div className="flex items-center justify-between mb-2.5">
            <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">
              Token
            </div>
            <span className="text-[10px] text-ink-4 font-mono tabular-nums">
              {livePrice?.decimals ?? 0} dp · nonce {livePrice?.nonce ?? '—'}
            </span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {TOKENS.map((t) => (
              <Chip
                key={t}
                selected={t === selectedToken}
                onClick={() => setSelectedToken(t)}
                className="shrink-0"
              >
                {t}
              </Chip>
            ))}
          </div>
        </section>

        {/* Live price card */}
        <Card className="px-5 py-6 text-center">
          <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">
            {pair}
          </div>
          <div className="mt-2 text-[48px] font-mono font-medium tabular-nums leading-none tracking-[-0.02em]">
            {displayPrice}
          </div>
          <div className="mt-3 text-[12px] text-ink-3 flex items-center justify-center gap-1.5">
            {priceLoading && <Loader2 className="w-3 h-3 animate-spin" />}
            {priceError ? (
              <span className="text-[var(--color-danger)]">oracle error: {priceError}</span>
            ) : (
              <span className="inline-flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-success)]" />
                Connect oracle · live · polled 2s
              </span>
            )}
          </div>
        </Card>

        {/* Duration selector */}
        <section>
          <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3 mb-2.5">
            Resolves in
          </div>
          <div className="grid grid-cols-4 gap-2">
            {DURATIONS.map(({ label, seconds }) => (
              <Chip
                key={seconds}
                selected={seconds === duration}
                onClick={() => setDuration(seconds)}
                className="h-11"
              >
                {label}
              </Chip>
            ))}
          </div>
        </section>

        {/* Stake amount */}
        <section>
          <h2 className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
            Stake (ORI)
          </h2>
          <div className="grid grid-cols-4 gap-2 mb-2">
            {AMOUNT_PRESETS.map((preset) => {
              const active = preset === amount
              return (
                <button
                  key={preset}
                  onClick={() => setAmount(preset)}
                  className={
                    'rounded-xl h-11 text-sm font-mono font-medium transition border ' +
                    (active
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-muted/40 text-foreground hover:bg-muted/80')
                  }
                >
                  {preset}
                </button>
              )
            })}
          </div>
          <input
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={amount}
            onChange={(e) => setAmount(sanitizeAmount(e.target.value))}
            placeholder="custom amount"
            aria-label="Custom stake amount in INIT"
            className="w-full rounded-xl border border-border bg-muted/40 px-3 h-11 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/40 focus:bg-muted/60 transition-colors"
          />
        </section>

        {/* HIGHER / LOWER buttons */}
        <section className="space-y-2">
          <button
            onClick={() => handlePredict('higher')}
            disabled={busy !== null || !livePrice}
            className="w-full rounded-2xl py-4 bg-success/20 border border-success/50 text-success text-lg font-semibold hover:bg-success/30 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {busy === 'higher' ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" /> Opening market…
              </>
            ) : (
              <>
                <TrendingUp className="w-5 h-5" /> HIGHER
              </>
            )}
          </button>
          <button
            onClick={() => handlePredict('lower')}
            disabled={busy !== null || !livePrice}
            className="w-full rounded-2xl py-4 bg-danger/20 border border-danger/50 text-danger text-lg font-semibold hover:bg-danger/30 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {busy === 'lower' ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" /> Opening market…
              </>
            ) : (
              <>
                <TrendingDown className="w-5 h-5" /> LOWER
              </>
            )}
          </button>
        </section>

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-danger/40 bg-danger/10 text-danger p-3 text-xs font-mono break-all">
            {error}
          </div>
        )}

        {/* Result */}
        {lastResult && (
          <div className="rounded-xl border border-success/40 bg-success/10 p-4 space-y-1 text-sm">
            <div className="font-semibold">
              Market #{lastResult.marketId} opened ·{' '}
              {lastResult.direction.toUpperCase()} {lastResult.token}
            </div>
            <div className="text-xs text-muted-foreground font-mono break-all">
              create: {lastResult.createTx}
            </div>
            <div className="text-xs text-muted-foreground font-mono break-all">
              stake: {lastResult.stakeTx}
            </div>
          </div>
        )}

        {/* Resolve + Claim (power-user controls — will be listified later) */}
        <section className="rounded-2xl border border-border bg-muted/10 p-4 space-y-3">
          <h2 className="text-xs uppercase tracking-widest text-muted-foreground">
            Resolve · Claim
          </h2>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={manualMarketId}
            onChange={(e) => setManualMarketId(e.target.value.replace(/[^0-9]/g, ''))}
            placeholder="market id (e.g. 1)"
            aria-label="Market id to resolve or claim"
            className="w-full rounded-xl border border-border bg-background px-3 h-10 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleManualAction('resolve')}
              disabled={manualBusy !== null || !manualMarketId}
              className="rounded-xl h-10 bg-muted hover:bg-border text-sm font-medium transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {manualBusy === 'resolve' ? 'Resolving…' : 'Resolve'}
            </button>
            <button
              onClick={() => handleManualAction('claim')}
              disabled={manualBusy !== null || !manualMarketId}
              className="rounded-xl h-10 bg-primary/10 text-primary hover:bg-primary/20 text-sm font-medium transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {manualBusy === 'claim' ? 'Claiming…' : 'Claim winnings'}
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            <span className="font-medium">Resolve</span> is permissionless
            after the market's deadline — anyone can trigger it.{' '}
            <span className="font-medium">Claim</span> pays out your share of
            the losing pool if you picked the winning side.
          </p>
        </section>

        {/* Info footer */}
        <div className="flex items-start gap-2 text-xs text-muted-foreground pb-4">
          <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <p>
            Creating a market immediately stakes you on your chosen side.
            Others can stake the opposite side. After the deadline anyone can
            resolve from the oracle. Winners claim proportional share of the
            losing pool. 1% fee on the losing pool goes to the Ori treasury.
          </p>
        </div>
      </div>
    </AppShell>
  )
}
