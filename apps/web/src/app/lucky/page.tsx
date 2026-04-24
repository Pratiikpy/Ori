'use client'

/**
 * /lucky — lucky pool raffles (lucky_pool module).
 *
 * Create a pool: set entry fee + max participants. Anyone can join paying
 * the fee. When filled (or at creator's call), draw() picks one winner who
 * receives the whole pot minus protocol fee.
 */
import { useCallback, useEffect, useState } from 'react'
import { useInterwovenKit } from '@initia/interwovenkit-react'
import { toast } from 'sonner'
import { Gift, Sparkles, Ticket, Users } from 'lucide-react'

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
import { ORI_CHAIN_ID, ORI_DECIMALS, ORI_DENOM, ORI_SYMBOL } from '@/lib/chain-config'
import {
  msgCreateLuckyPool,
  msgDrawLuckyPool,
  msgJoinLuckyPool,
} from '@/lib/contracts'
import {
  buildAutoSignFee,
  extractMoveEventData,
  friendlyError,
  sendTx,
} from '@/lib/tx'

const STORAGE_KEY = 'ori.lucky.known.v1'

interface LocalPool {
  poolId: string
  entryFee: string
  maxParticipants: number
  role: 'creator' | 'participant'
  createdAt: number
}

function readLocal(): LocalPool[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]') as LocalPool[]
  } catch {
    return []
  }
}
function writeLocal(v: LocalPool[]) {
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

const SLOT_PRESETS = [5, 10, 25, 50, 100]

export default function LuckyPage() {
  const kit = useInterwovenKit()
  const { initiaAddress, isConnected, openConnect } = kit
  const { isEnabled: autoSign } = useAutoSign()

  const [fee, setFee] = useState('')
  const [slots, setSlots] = useState(10)
  const [joinId, setJoinId] = useState('')
  const [items, setItems] = useState<LocalPool[]>([])
  const [busy, setBusy] = useState<'create' | 'join' | null>(null)

  useEffect(() => {
    setItems(readLocal())
  }, [])

  const create = useCallback(async () => {
    if (!isConnected) return openConnect()
    if (!initiaAddress) return
    const feeBase = toBaseUnits(fee)
    if (feeBase <= 0n) {
      toast.error('Entry fee must be positive')
      return
    }
    setBusy('create')
    try {
      const msg = msgCreateLuckyPool({
        creator: initiaAddress,
        entryFee: feeBase,
        maxParticipants: BigInt(slots),
        denom: ORI_DENOM,
      })
      const res = await sendTx(kit, {
        chainId: ORI_CHAIN_ID,
        messages: [msg],
        autoSign,
        fee: autoSign ? buildAutoSignFee(600_000) : undefined,
      })
      const ev = extractMoveEventData(res.rawResponse, '::lucky_pool::PoolCreated')
      const poolId =
        (ev?.pool_id as string | undefined) ??
        (ev?.id as string | undefined) ??
        Date.now().toString()
      const next: LocalPool[] = [
        {
          poolId,
          entryFee: feeBase.toString(),
          maxParticipants: slots,
          role: 'creator',
          createdAt: Math.floor(Date.now() / 1000),
        },
        ...items,
      ]
      setItems(next)
      writeLocal(next)
      setFee('')
      toast.success(`Pool #${poolId} is open`)
    } catch (e) {
      toast.error(friendlyError(e))
    } finally {
      setBusy(null)
    }
  }, [isConnected, initiaAddress, fee, slots, kit, autoSign, items, openConnect])

  const join = useCallback(async () => {
    if (!isConnected) return openConnect()
    if (!initiaAddress) return
    const parsed = joinId.trim().replace(/^#/, '')
    if (!parsed || !/^\d+$/.test(parsed)) {
      toast.error('Pool ID must be a number')
      return
    }
    setBusy('join')
    try {
      const msg = msgJoinLuckyPool({
        participant: initiaAddress,
        poolId: BigInt(parsed),
      })
      await sendTx(kit, {
        chainId: ORI_CHAIN_ID,
        messages: [msg],
        autoSign,
        fee: autoSign ? buildAutoSignFee(500_000) : undefined,
      })
      if (!items.some((p) => p.poolId === parsed)) {
        const next: LocalPool[] = [
          {
            poolId: parsed,
            entryFee: '0',
            maxParticipants: 0,
            role: 'participant',
            createdAt: Math.floor(Date.now() / 1000),
          },
          ...items,
        ]
        setItems(next)
        writeLocal(next)
      }
      setJoinId('')
      toast.success(`Joined pool #${parsed}`)
    } catch (e) {
      toast.error(friendlyError(e))
    } finally {
      setBusy(null)
    }
  }, [isConnected, initiaAddress, joinId, kit, autoSign, items, openConnect])

  const draw = async (p: LocalPool) => {
    if (!initiaAddress) return
    try {
      const msg = msgDrawLuckyPool({
        caller: initiaAddress,
        poolId: BigInt(p.poolId),
      })
      await sendTx(kit, {
        chainId: ORI_CHAIN_ID,
        messages: [msg],
        autoSign,
        fee: autoSign ? buildAutoSignFee(700_000) : undefined,
      })
      toast.success('Winner drawn — check the chain for the tx')
    } catch (e) {
      toast.error(friendlyError(e))
    }
  }

  return (
    <AppShell title="Lucky pools">
      <div className="max-w-2xl mx-auto w-full px-5 pt-8 pb-10 space-y-10">
        <PageHeader
          kicker="· Lucky"
          title={
            <>
              One pot, <Serif>one winner</Serif>.
            </>
          }
          sub="Create a raffle pool with an entry fee and participant cap. Anyone can join. Draw picks one recipient for the whole pot."
        />

        <div className="grid md:grid-cols-2 gap-4">
          <Reveal>
            <Card>
              <CardHeader>
                <Eyebrow>Create a pool</Eyebrow>
              </CardHeader>
              <CardBody className="space-y-4">
                <Field label={`Entry fee (${ORI_SYMBOL})`}>
                  <Input
                    placeholder="0"
                    inputMode="decimal"
                    value={fee}
                    onChange={(e) => setFee(e.target.value.replace(/[^0-9.]/g, ''))}
                    className="font-mono"
                  />
                </Field>
                <Field label="Max participants">
                  <div className="flex flex-wrap gap-2">
                    {SLOT_PRESETS.map((n) => (
                      <Chip key={n} selected={slots === n} onClick={() => setSlots(n)}>
                        {n}
                      </Chip>
                    ))}
                  </div>
                </Field>
                <Button
                  onClick={() => void create()}
                  loading={busy === 'create'}
                  className="w-full"
                  leftIcon={<Ticket className="w-4 h-4" />}
                >
                  Open pool
                </Button>
              </CardBody>
            </Card>
          </Reveal>

          <Reveal delay={80}>
            <Card>
              <CardHeader>
                <Eyebrow>Join a pool</Eyebrow>
              </CardHeader>
              <CardBody className="space-y-4">
                <Field label="Pool ID" hint="Must be live and have a free slot">
                  <Input
                    placeholder="e.g. 42"
                    value={joinId}
                    onChange={(e) => setJoinId(e.target.value.replace(/[^0-9]/g, ''))}
                    className="font-mono"
                  />
                </Field>
                <Button
                  variant="secondary"
                  onClick={() => void join()}
                  loading={busy === 'join'}
                  className="w-full"
                  leftIcon={<Users className="w-4 h-4" />}
                >
                  Enter pool
                </Button>
              </CardBody>
            </Card>
          </Reveal>
        </div>

        <section className="space-y-4">
          <Eyebrow>Pools you know about</Eyebrow>
          {items.length === 0 ? (
            <Card>
              <EmptyState
                icon={<Gift className="w-5 h-5" />}
                title="No pools yet"
                description="Create a pool above, or paste the ID of one someone shared with you."
              />
            </Card>
          ) : (
            <div className="space-y-3">
              {items.map((p) => (
                <Card key={p.poolId} className="p-5 flex items-center gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono uppercase tracking-[0.12em] text-ink-3">
                        #{p.poolId}
                      </span>
                      {p.role === 'creator' ? (
                        <Pill tone="accent">creator</Pill>
                      ) : (
                        <Pill>entered</Pill>
                      )}
                    </div>
                    {p.role === 'creator' && (
                      <div className="mt-1.5 font-mono text-[13px] text-ink-2">
                        {fromBaseUnits(BigInt(p.entryFee))} {ORI_SYMBOL} · {p.maxParticipants} slots
                      </div>
                    )}
                  </div>
                  {p.role === 'creator' && (
                    <Button
                      size="sm"
                      onClick={() => void draw(p)}
                      leftIcon={<Sparkles className="w-3.5 h-3.5" />}
                    >
                      Draw
                    </Button>
                  )}
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  )
}
