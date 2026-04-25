'use client'

/**
 * /predict — open a parimutuel prediction market in one screen.
 *
 * Pick token (BTC/ETH/SOL/BNB/ATOM), pick duration, set stake, hit
 * Higher or Lower. The Move module creates the market AND stakes the
 * user on their chosen side in the same flow (legacy did this in two
 * sequential txs; we keep that pattern via the existing
 * `msgCreatePredictionMarket` + `msgStakePrediction` helpers).
 *
 * Resolution + claim happen on the market detail page (deferred for the
 * minimalist rebuild — the demo is "open a market in one prompt", which
 * this page covers).
 */
import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useInterwovenKit } from '@initia/interwovenkit-react'
import { toast } from 'sonner'
import { AppShell } from '@/components/layout/app-shell'
import {
  Button,
  GlassCard,
  Icon,
  Input,
  PageHeader,
  Eyebrow,
} from '@/components/ui'
import { useAutoSign } from '@/hooks/use-auto-sign'
import { ORI_CHAIN_ID, GAS_LIMITS, POLL_INTERVALS } from '@/lib/chain-config'
import { getOraclePrice, type OraclePrice } from '@/lib/api'
import {
  msgCreatePredictionMarket,
  msgStakePrediction,
} from '@/lib/contracts'
import { buildAutoSignFee, sendTx } from '@/lib/tx'

const TOKENS = ['BTC', 'ETH', 'SOL', 'BNB', 'ATOM'] as const
type Token = (typeof TOKENS)[number]

const DURATIONS: Array<{ label: string; seconds: number }> = [
  { label: '60s', seconds: 60 },
  { label: '5 min', seconds: 300 },
  { label: '1 hr', seconds: 3600 },
  { label: '1 day', seconds: 86400 },
]

const PRESETS = ['0.1', '0.5', '1', '5'] as const

export default function PredictPage() {
  const router = useRouter()
  const kit = useInterwovenKit()
  const { isConnected, openConnect } = kit
  const { isEnabled: autoSign } = useAutoSign()

  const [token, setToken] = React.useState<Token>('BTC')
  const [duration, setDuration] = React.useState<number>(60)
  const [amount, setAmount] = React.useState<string>('0.1')
  const [livePrice, setLivePrice] = React.useState<OraclePrice | null>(null)
  const [priceErr, setPriceErr] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState<'higher' | 'lower' | null>(null)

  const pair = `${token}/USD`

  // Poll oracle price every 2s
  React.useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null
    const tick = async () => {
      try {
        const p = await getOraclePrice(pair)
        if (!cancelled) {
          setLivePrice(p)
          setPriceErr(null)
        }
      } catch (e) {
        if (!cancelled) {
          setPriceErr(e instanceof Error ? e.message : 'oracle error')
        }
      } finally {
        if (!cancelled) timer = setTimeout(tick, POLL_INTERVALS.oraclePrice)
      }
    }
    tick()
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [pair])

  const displayPrice = React.useMemo(() => {
    if (priceErr) return '—'
    if (!livePrice) return '…'
    return formatDisplay(livePrice.price, livePrice.decimals)
  }, [livePrice, priceErr])

  const handlePredict = async (direction: 'higher' | 'lower') => {
    if (!isConnected) {
      void openConnect()
      return
    }
    if (!livePrice) {
      toast.error('Oracle price not loaded yet')
      return
    }
    if (!kit.initiaAddress) return
    const stakeBase = parseAmountToBase(amount, 6)
    if (stakeBase <= 0n) {
      toast.error('Enter a stake amount')
      return
    }

    setBusy(direction)
    try {
      const createMsg = msgCreatePredictionMarket({
        sender: kit.initiaAddress,
        oraclePair: pair,
        targetPrice: BigInt(livePrice.price),
        comparator: direction === 'higher',
        deadlineSeconds: BigInt(duration),
      })
      const createRes = await sendTx(kit, {
        chainId: ORI_CHAIN_ID,
        messages: [createMsg],
        autoSign,
        fee: autoSign ? buildAutoSignFee(GAS_LIMITS.mediumTx) : undefined,
      })
      // Parse market id; fall back to "look at the tx hash"
      const marketIdMatch = JSON.stringify(createRes.rawResponse).match(
        /"id"\s*:\s*"?(\d+)/,
      )
      const marketId = marketIdMatch ? BigInt(marketIdMatch[1]!) : 0n
      const stakeMsg = msgStakePrediction({
        sender: kit.initiaAddress,
        marketId,
        sideYes: true,
        amount: stakeBase,
      })
      await sendTx(kit, {
        chainId: ORI_CHAIN_ID,
        messages: [stakeMsg],
        autoSign,
        fee: autoSign ? buildAutoSignFee(GAS_LIMITS.simpleTx) : undefined,
      })
      toast.success(
        `Market opened: ${pair} ${direction.toUpperCase()} in ${formatSecs(duration)}`,
      )
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Predict failed')
    } finally {
      setBusy(null)
    }
  }

  return (
    <AppShell>
      <PageHeader
        title="Predict"
        description="Higher or lower in 60 seconds. Settled by Connect oracle. No counterparty, no liquidation."
      />

      <div className="mt-10 grid lg:grid-cols-[1.2fr_1fr] gap-5">
        {/* LEFT — controls */}
        <GlassCard padding="lg">
          {/* Token selector */}
          <Eyebrow>Token</Eyebrow>
          <div className="mt-3 flex flex-wrap gap-2">
            {TOKENS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setToken(t)}
                className={[
                  'rounded-full px-4 h-9 text-[13px] font-medium transition',
                  token === t
                    ? 'bg-[#1D1D1F] text-white'
                    : 'bg-white/60 text-ink-2 hover:bg-white/80 hover:text-ink border border-black/5',
                ].join(' ')}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Duration */}
          <div className="mt-7">
            <Eyebrow>Resolves in</Eyebrow>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {DURATIONS.map((d) => {
                const active = d.seconds === duration
                return (
                  <button
                    key={d.seconds}
                    type="button"
                    onClick={() => setDuration(d.seconds)}
                    className={[
                      'rounded-2xl h-12 text-[13px] font-medium transition',
                      active
                        ? 'bg-[#1D1D1F] text-white'
                        : 'bg-white/60 text-ink-2 border border-black/5 hover:bg-white/80 hover:text-ink',
                    ].join(' ')}
                  >
                    {d.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Stake */}
          <div className="mt-7">
            <Eyebrow>Stake</Eyebrow>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {PRESETS.map((p) => {
                const active = p === amount
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setAmount(p)}
                    className={[
                      'rounded-2xl h-12 text-[13px] font-mono font-medium transition',
                      active
                        ? 'bg-[#1D1D1F] text-white'
                        : 'bg-white/60 text-ink-2 border border-black/5 hover:bg-white/80 hover:text-ink',
                    ].join(' ')}
                  >
                    {p}
                  </button>
                )
              })}
            </div>
            <Input
              className="mt-3"
              value={amount}
              onChange={(e) => setAmount(sanitize(e.target.value))}
              placeholder="custom"
              mono
              size="sm"
              inputMode="decimal"
            />
          </div>

          {/* HIGHER / LOWER */}
          <div className="mt-8 grid grid-cols-2 gap-3">
            <button
              type="button"
              disabled={busy !== null || !livePrice}
              onClick={() => handlePredict('higher')}
              className="rounded-2xl h-14 bg-[#058A4D]/10 hover:bg-[#058A4D]/15 text-[#058A4D] text-[16px] font-medium inline-flex items-center justify-center gap-2 transition disabled:opacity-40 active:scale-[0.97]"
            >
              <Icon name="arrow-up" size={18} weight="bold" />
              Higher
            </button>
            <button
              type="button"
              disabled={busy !== null || !livePrice}
              onClick={() => handlePredict('lower')}
              className="rounded-2xl h-14 bg-[#B91C1C]/10 hover:bg-[#B91C1C]/15 text-[#B91C1C] text-[16px] font-medium inline-flex items-center justify-center gap-2 transition disabled:opacity-40 active:scale-[0.97]"
            >
              <Icon name="arrow-down" size={18} weight="bold" />
              Lower
            </button>
          </div>
          <p className="mt-3 text-[12px] text-ink-3 text-center">
            Creates a market AND stakes you on the chosen side. Two transactions, signed once if auto-sign is on.
          </p>
        </GlassCard>

        {/* RIGHT — live price */}
        <GlassCard padding="lg" className="flex flex-col">
          <Eyebrow>{pair}</Eyebrow>
          <div className="mt-4 flex-1 flex flex-col items-center justify-center text-center">
            <div
              className="font-display tnum text-ink leading-none"
              style={{ fontSize: 'clamp(40px, 6vw, 64px)', fontWeight: 500 }}
            >
              {priceErr ? '—' : displayPrice}
            </div>
            <div className="mt-3 text-[12px] text-ink-3 font-mono uppercase tracking-[0.1em]">
              {priceErr ? (
                <span className="text-[#B91C1C]">oracle unreachable</span>
              ) : (
                'live · polls every 2s'
              )}
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-black/5 text-[12px] text-ink-3 leading-[1.6]">
            Source: Connect oracle on the ori-1 rollup. Markets settle automatically against the oracle's price at deadline; the losing pool funds the winners minus a 1% fee.
          </div>
        </GlassCard>
      </div>
    </AppShell>
  )
}

function formatDisplay(raw: string, decimals: number): string {
  const n = Number(raw) / 10 ** decimals
  if (n >= 1000) return `$${n.toFixed(2)}`
  if (n >= 1) return `$${n.toFixed(4)}`
  return `$${n.toFixed(Math.min(8, decimals))}`
}

function formatSecs(s: number): string {
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.round(s / 60)} min`
  if (s < 86400) return `${Math.round(s / 3600)} hr`
  return `${Math.round(s / 86400)} day`
}

function sanitize(raw: string): string {
  const cleaned = raw.replace(/[^0-9.]/g, '')
  const parts = cleaned.split('.')
  if (parts.length <= 1) return cleaned
  return parts[0] + '.' + parts.slice(1).join('').slice(0, 6)
}

function parseAmountToBase(s: string, decimals: number): bigint {
  if (!s) return 0n
  const [whole, fracRaw = ''] = s.split('.')
  const frac = (fracRaw + '0'.repeat(decimals)).slice(0, decimals)
  return BigInt(whole || '0') * 10n ** BigInt(decimals) + BigInt(frac || '0')
}
