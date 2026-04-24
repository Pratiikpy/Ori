'use client'

/**
 * /streams — continuous per-second payment streams (payment_stream module).
 *
 * Flows:
 *   - Open a stream: pick recipient, rate/sec, duration → msgOpenStream.
 *   - Withdraw accrued (recipient only) → msgWithdrawStream.
 *   - Close stream (sender only)        → msgCloseStream.
 *
 * Stream records are stored on-chain by the module; the API does not yet
 * expose a list endpoint. So this page persists a user-local index of
 * streams they opened/received (streamId + counterparty + rate + start),
 * and live-computes accrued amount client-side. Source of truth is the
 * chain; local cache is only for "what streams do I know about."
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useInterwovenKit } from '@initia/interwovenkit-react'
import { toast } from 'sonner'
import { ArrowDownToLine, Loader2, PlayCircle, Radio, StopCircle } from 'lucide-react'

import { AppShell } from '@/components/app-shell'
import { PageHeader, Serif } from '@/components/page-header'
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  EmptyState,
  Eyebrow,
  Field,
  Input,
  Pill,
  Reveal,
} from '@/components/ui'
import { useAutoSign } from '@/hooks/use-auto-sign'
import { useResolve } from '@/hooks/use-resolve'
import {
  ORI_CHAIN_ID,
  ORI_DECIMALS,
  ORI_DENOM,
  ORI_SYMBOL,
} from '@/lib/chain-config'
import {
  msgCloseStream,
  msgOpenStream,
  msgWithdrawStream,
} from '@/lib/contracts'
import {
  buildAutoSignFee,
  extractMoveEventData,
  friendlyError,
  sendTx,
} from '@/lib/tx'

type Role = 'sender' | 'recipient'

interface LocalStream {
  streamId: string // bigint as string
  counterparty: string
  counterpartyName?: string
  ratePerSecond: string // base units / sec
  startedAt: number // unix seconds
  durationSeconds: number
  role: Role
  totalLocked: string
}

const STORAGE_KEY = 'ori.streams.v1'

function readLocal(): LocalStream[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]') as LocalStream[]
  } catch {
    return []
  }
}
function writeLocal(v: LocalStream[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(v))
}

function toBaseUnits(human: string, decimals = ORI_DECIMALS): bigint {
  if (!human) return 0n
  const [whole, fracRaw = ''] = human.split('.') as [string, string?]
  const frac = (fracRaw + '0'.repeat(decimals)).slice(0, decimals)
  return BigInt(whole || '0') * 10n ** BigInt(decimals) + BigInt(frac || '0')
}

function fromBaseUnits(base: bigint, decimals = ORI_DECIMALS): string {
  const d = 10n ** BigInt(decimals)
  const whole = base / d
  const frac = (base % d).toString().padStart(decimals, '0').replace(/0+$/, '')
  return frac ? `${whole}.${frac}` : whole.toString()
}

const DURATIONS = [
  { label: '1 hr', seconds: 3600 },
  { label: '1 day', seconds: 86400 },
  { label: '1 week', seconds: 604800 },
  { label: '1 month', seconds: 2592000 },
]

export default function StreamsPage() {
  const kit = useInterwovenKit()
  const { initiaAddress, isConnected, openConnect } = kit
  const { isEnabled: autoSign } = useAutoSign()

  const [recipient, setRecipient] = useState('')
  const [amount, setAmount] = useState('')
  const [duration, setDuration] = useState(86400)
  const [busy, setBusy] = useState(false)
  const [streams, setStreams] = useState<LocalStream[]>([])
  const [tick, setTick] = useState(0)

  useEffect(() => {
    setStreams(readLocal())
  }, [])

  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 1000)
    return () => clearInterval(id)
  }, [])

  const { data: resolved } = useResolve(recipient || null)

  const ratePerSecond = useMemo(() => {
    if (!amount || duration <= 0) return 0n
    return toBaseUnits(amount) / BigInt(duration)
  }, [amount, duration])

  const handleOpen = useCallback(async () => {
    if (!isConnected) {
      openConnect()
      return
    }
    if (!initiaAddress) return
    if (!resolved?.initiaAddress) {
      toast.error('Recipient not resolved')
      return
    }
    if (ratePerSecond <= 0n) {
      toast.error('Rate works out to zero — raise the amount or shorten the duration')
      return
    }

    setBusy(true)
    try {
      const msg = msgOpenStream({
        sender: initiaAddress,
        recipient: resolved.initiaAddress,
        ratePerSecond,
        durationSeconds: BigInt(duration),
        denom: ORI_DENOM,
      })
      const res = await sendTx(kit, {
        chainId: ORI_CHAIN_ID,
        messages: [msg],
        autoSign,
        fee: autoSign ? buildAutoSignFee(700_000) : undefined,
      })

      const ev = extractMoveEventData(res.rawResponse, '::payment_stream::StreamOpened')
      const streamId = (ev?.stream_id ?? ev?.id ?? Date.now().toString()) as string

      const local: LocalStream = {
        streamId,
        counterparty: resolved.initiaAddress,
        counterpartyName: resolved.initName ?? undefined,
        ratePerSecond: ratePerSecond.toString(),
        startedAt: Math.floor(Date.now() / 1000),
        durationSeconds: duration,
        role: 'sender',
        totalLocked: toBaseUnits(amount).toString(),
      }
      const next = [local, ...streams]
      setStreams(next)
      writeLocal(next)
      setAmount('')
      setRecipient('')
      toast.success(`Stream opened — ${fromBaseUnits(ratePerSecond)} ${ORI_SYMBOL}/sec`)
    } catch (e) {
      toast.error(friendlyError(e))
    } finally {
      setBusy(false)
    }
  }, [
    isConnected,
    initiaAddress,
    resolved,
    ratePerSecond,
    amount,
    duration,
    kit,
    autoSign,
    streams,
    openConnect,
  ])

  const handleWithdraw = async (s: LocalStream) => {
    if (!initiaAddress) return
    try {
      const msg = msgWithdrawStream({
        recipient: initiaAddress,
        streamId: BigInt(s.streamId),
      })
      await sendTx(kit, {
        chainId: ORI_CHAIN_ID,
        messages: [msg],
        autoSign,
        fee: autoSign ? buildAutoSignFee(400_000) : undefined,
      })
      toast.success('Withdrew accrued balance')
    } catch (e) {
      toast.error(friendlyError(e))
    }
  }

  const handleClose = async (s: LocalStream) => {
    if (!initiaAddress) return
    try {
      const msg = msgCloseStream({
        sender: initiaAddress,
        streamId: BigInt(s.streamId),
      })
      await sendTx(kit, {
        chainId: ORI_CHAIN_ID,
        messages: [msg],
        autoSign,
        fee: autoSign ? buildAutoSignFee(400_000) : undefined,
      })
      const next = streams.filter((x) => x.streamId !== s.streamId)
      setStreams(next)
      writeLocal(next)
      toast.success('Stream closed')
    } catch (e) {
      toast.error(friendlyError(e))
    }
  }

  const forgetStream = (s: LocalStream) => {
    const next = streams.filter((x) => x.streamId !== s.streamId)
    setStreams(next)
    writeLocal(next)
  }

  return (
    <AppShell title="Streams">
      <div className="max-w-2xl mx-auto w-full px-5 pt-8 pb-10 space-y-10">
        <PageHeader
          kicker="· Streams"
          title={
            <>
              Money by the <Serif>second</Serif>.
            </>
          }
          sub={`Open a continuous stream to anyone on ${ORI_SYMBOL}. The recipient can withdraw accrued balance at any moment; you can close it when you want the unvested remainder back.`}
        />

        <Reveal>
          <Card>
            <CardHeader>
              <Eyebrow>Open a new stream</Eyebrow>
            </CardHeader>
            <CardBody className="space-y-5">
              <Field label="Recipient" hint="Any .init name or init1… address">
                <Input
                  placeholder="alice.init or init1…"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  className="font-mono"
                />
                {resolved && (
                  <div className="mt-1.5 text-[12px] text-[var(--color-success)]">
                    Resolved → {resolved.initName ?? resolved.initiaAddress}
                  </div>
                )}
              </Field>

              <Field
                label={`Total amount (${ORI_SYMBOL})`}
                hint="Amount streamed over the full duration"
              >
                <Input
                  placeholder="0"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                  className="font-mono"
                />
              </Field>

              <Field label="Duration">
                <div className="flex flex-wrap gap-2">
                  {DURATIONS.map((d) => (
                    <Chip
                      key={d.seconds}
                      selected={duration === d.seconds}
                      onClick={() => setDuration(d.seconds)}
                    >
                      {d.label}
                    </Chip>
                  ))}
                </div>
              </Field>

              {ratePerSecond > 0n && (
                <div className="rounded-xl bg-white/[0.03] border border-[var(--color-border)] px-4 py-3 text-[13px] text-ink-2 flex items-center justify-between">
                  <span className="font-mono text-ink-3">rate</span>
                  <span className="font-mono tabular-nums text-foreground">
                    {fromBaseUnits(ratePerSecond)} {ORI_SYMBOL}
                    <span className="text-ink-3"> / sec</span>
                  </span>
                </div>
              )}

              <Button
                onClick={() => void handleOpen()}
                disabled={!amount || !resolved}
                loading={busy}
                size="lg"
                className="w-full"
                rightIcon={<PlayCircle className="w-4 h-4" />}
              >
                {busy ? 'Opening…' : `Open stream${autoSign ? ' · 1-tap' : ''}`}
              </Button>
            </CardBody>
          </Card>
        </Reveal>

        <section className="space-y-4">
          <div className="flex items-end justify-between">
            <div>
              <Eyebrow>Active streams</Eyebrow>
              <h2 className="mt-2 text-[22px] font-medium tracking-tight">
                Your <Serif>live</Serif> streams
              </h2>
            </div>
            <Pill tone="ok">
              <span
                className="w-1.5 h-1.5 rounded-full bg-[var(--color-success)]"
                style={{ animation: 'ori-hero-pulse 2.4s ease-in-out infinite' }}
              />
              live
            </Pill>
          </div>

          {streams.length === 0 ? (
            <Card>
              <EmptyState
                icon={<Radio className="w-5 h-5" />}
                title="No streams yet"
                description="Open your first one above — it starts the moment the block confirms."
              />
            </Card>
          ) : (
            <div className="space-y-3">
              {streams.map((s) => (
                <StreamRow
                  key={s.streamId}
                  s={s}
                  myAddress={initiaAddress ?? ''}
                  onWithdraw={() => void handleWithdraw(s)}
                  onClose={() => void handleClose(s)}
                  onForget={() => forgetStream(s)}
                  tick={tick}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  )
}

function StreamRow({
  s,
  myAddress,
  onWithdraw,
  onClose,
  onForget,
  tick: _tick,
}: {
  s: LocalStream
  myAddress: string
  onWithdraw: () => void
  onClose: () => void
  onForget: () => void
  tick: number
}) {
  const now = Math.floor(Date.now() / 1000)
  const elapsed = Math.max(0, Math.min(now - s.startedAt, s.durationSeconds))
  const progress = s.durationSeconds === 0 ? 0 : (elapsed / s.durationSeconds) * 100
  const accrued = BigInt(s.ratePerSecond) * BigInt(elapsed)
  const locked = BigInt(s.totalLocked)
  const remaining = locked > accrued ? locked - accrued : 0n
  const ended = elapsed >= s.durationSeconds

  const isSender = s.role === 'sender'
  const counterpartyLabel =
    s.counterpartyName ??
    `${s.counterparty.slice(0, 10)}…${s.counterparty.slice(-4)}`

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-[0.12em] text-ink-3">
            {isSender ? 'you → ' : '→ you'}
          </div>
          <div className="mt-1 text-[15px] font-medium text-foreground font-mono">
            {counterpartyLabel}
          </div>
        </div>
        <Pill tone={ended ? 'default' : 'accent'}>{ended ? 'ended' : 'streaming'}</Pill>
      </div>

      <div className="h-1 w-full rounded-full bg-white/[0.04] overflow-hidden">
        <div
          className="h-full bg-primary transition-[width] duration-1000 ease-linear"
          style={{ width: `${Math.min(100, progress)}%` }}
        />
      </div>

      <div className="grid grid-cols-3 gap-3 font-mono text-[12px]">
        <Metric label="accrued" value={`${fromBaseUnits(accrued)} ${ORI_SYMBOL}`} />
        <Metric label="remaining" value={`${fromBaseUnits(remaining)} ${ORI_SYMBOL}`} />
        <Metric label="rate/sec" value={fromBaseUnits(BigInt(s.ratePerSecond))} />
      </div>

      <div className="flex items-center gap-2 pt-1">
        {!isSender && myAddress && (
          <Button
            variant="secondary"
            size="sm"
            onClick={onWithdraw}
            leftIcon={<ArrowDownToLine className="w-3.5 h-3.5" />}
          >
            Withdraw
          </Button>
        )}
        {isSender && !ended && (
          <Button
            variant="danger"
            size="sm"
            onClick={onClose}
            leftIcon={<StopCircle className="w-3.5 h-3.5" />}
          >
            Close
          </Button>
        )}
        <button
          onClick={onForget}
          className="ml-auto text-[11px] text-ink-4 hover:text-ink-2 transition"
          title="Remove from this device only"
        >
          forget
        </button>
      </div>
    </Card>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-ink-4 uppercase tracking-[0.1em] text-[10px]">{label}</span>
      <span className="mt-1 text-foreground text-[13px] tabular-nums">{value}</span>
    </div>
  )
}
