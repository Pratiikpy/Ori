'use client'

/**
 * /subscriptions — recurring plans (subscription_vault module).
 *
 * Two modes:
 *   - "Being a creator": register your plan (1 plan per creator), deactivate.
 *   - "Being a subscriber": browse a creator by address/name and subscribe
 *     N periods. Cancel any time. Caller permissionless release_period after
 *     the period ends.
 */
import { useCallback, useEffect, useState } from 'react'
import { useInterwovenKit } from '@initia/interwovenkit-react'
import { toast } from 'sonner'
import {
  CalendarClock,
  Repeat,
  Sparkles,
  Users,
  X,
} from 'lucide-react'

import { AppShell } from '@/components/app-shell'
import { PageHeader, Serif } from '@/components/page-header'
import { EmptyState } from '@/components/empty-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { useAutoSign } from '@/hooks/use-auto-sign'
import { useResolve } from '@/hooks/use-resolve'
import {
  ORI_CHAIN_ID,
  ORI_DECIMALS,
  ORI_DENOM,
  ORI_SYMBOL,
} from '@/lib/chain-config'
import {
  msgCancelSubscription,
  msgDeactivateSubscriptionPlan,
  msgRegisterSubscriptionPlan,
  msgReleaseSubscriptionPeriod,
  msgSubscribe,
} from '@/lib/contracts'
import {
  buildAutoSignFee,
  friendlyError,
  sendTx,
} from '@/lib/tx'

interface LocalPlan {
  price: string
  periodSeconds: number
  createdAt: number
}
interface LocalSubscription {
  creator: string
  creatorName?: string
  periods: number
  pricePerPeriod: string
  periodSeconds: number
  subscribedAt: number
}

const PLAN_KEY = 'ori.subscriptions.my_plan.v1'
const SUBS_KEY = 'ori.subscriptions.my_subs.v1'

const PERIOD_PRESETS = [
  { label: 'Weekly', seconds: 604800 },
  { label: 'Monthly', seconds: 2592000 },
  { label: 'Quarterly', seconds: 7776000 },
]

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

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const v = window.localStorage.getItem(key)
    return v ? (JSON.parse(v) as T) : fallback
  } catch {
    return fallback
  }
}
function writeJson<T>(key: string, v: T) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(key, JSON.stringify(v))
}

export default function SubscriptionsPage() {
  const kit = useInterwovenKit()
  const { initiaAddress, isConnected, openConnect } = kit
  const { isEnabled: autoSign } = useAutoSign()

  const [tab, setTab] = useState<'subscribe' | 'plan'>('subscribe')

  // === Plan (creator) state ===
  const [planPrice, setPlanPrice] = useState('')
  const [planPeriod, setPlanPeriod] = useState(2592000)
  const [myPlan, setMyPlan] = useState<LocalPlan | null>(null)
  const [planBusy, setPlanBusy] = useState(false)

  // === Subscribe state ===
  const [creatorInput, setCreatorInput] = useState('')
  const [periods, setPeriods] = useState(1)
  const [subs, setSubs] = useState<LocalSubscription[]>([])
  const [subBusy, setSubBusy] = useState(false)
  const { data: resolved } = useResolve(creatorInput || null)

  useEffect(() => {
    setMyPlan(readJson<LocalPlan | null>(PLAN_KEY, null))
    setSubs(readJson<LocalSubscription[]>(SUBS_KEY, []))
  }, [])

  const registerPlan = useCallback(async () => {
    if (!isConnected) return openConnect()
    if (!initiaAddress) return
    const price = toBaseUnits(planPrice)
    if (price <= 0n) {
      toast.error('Price must be positive')
      return
    }
    setPlanBusy(true)
    try {
      const msg = msgRegisterSubscriptionPlan({
        creator: initiaAddress,
        pricePerPeriod: price,
        periodSeconds: BigInt(planPeriod),
        denom: ORI_DENOM,
      })
      await sendTx(kit, {
        chainId: ORI_CHAIN_ID,
        messages: [msg],
        autoSign,
        fee: autoSign ? buildAutoSignFee(600_000) : undefined,
      })
      const plan: LocalPlan = {
        price: price.toString(),
        periodSeconds: planPeriod,
        createdAt: Math.floor(Date.now() / 1000),
      }
      setMyPlan(plan)
      writeJson(PLAN_KEY, plan)
      setPlanPrice('')
      toast.success('Plan registered')
    } catch (e) {
      toast.error(friendlyError(e))
    } finally {
      setPlanBusy(false)
    }
  }, [isConnected, initiaAddress, planPrice, planPeriod, kit, autoSign, openConnect])

  const deactivatePlan = useCallback(async () => {
    if (!initiaAddress) return
    setPlanBusy(true)
    try {
      const msg = msgDeactivateSubscriptionPlan({ creator: initiaAddress })
      await sendTx(kit, {
        chainId: ORI_CHAIN_ID,
        messages: [msg],
        autoSign,
        fee: autoSign ? buildAutoSignFee(400_000) : undefined,
      })
      setMyPlan(null)
      writeJson(PLAN_KEY, null)
      toast.success('Plan deactivated')
    } catch (e) {
      toast.error(friendlyError(e))
    } finally {
      setPlanBusy(false)
    }
  }, [initiaAddress, kit, autoSign])

  const subscribe = useCallback(async () => {
    if (!isConnected) return openConnect()
    if (!initiaAddress) return
    if (!resolved?.initiaAddress) {
      toast.error('Creator not resolved')
      return
    }
    if (periods < 1) return
    setSubBusy(true)
    try {
      const msg = msgSubscribe({
        subscriber: initiaAddress,
        creator: resolved.initiaAddress,
        periods: BigInt(periods),
      })
      await sendTx(kit, {
        chainId: ORI_CHAIN_ID,
        messages: [msg],
        autoSign,
        fee: autoSign ? buildAutoSignFee(700_000) : undefined,
      })
      const local: LocalSubscription = {
        creator: resolved.initiaAddress,
        creatorName: resolved.initName ?? undefined,
        periods,
        pricePerPeriod: '0',
        periodSeconds: 0,
        subscribedAt: Math.floor(Date.now() / 1000),
      }
      const next = [local, ...subs.filter((s) => s.creator !== resolved.initiaAddress)]
      setSubs(next)
      writeJson(SUBS_KEY, next)
      setCreatorInput('')
      setPeriods(1)
      toast.success(`Subscribed · ${periods} period${periods === 1 ? '' : 's'}`)
    } catch (e) {
      toast.error(friendlyError(e))
    } finally {
      setSubBusy(false)
    }
  }, [isConnected, initiaAddress, resolved, periods, kit, autoSign, subs, openConnect])

  const cancel = async (s: LocalSubscription) => {
    if (!initiaAddress) return
    try {
      const msg = msgCancelSubscription({
        subscriber: initiaAddress,
        creator: s.creator,
      })
      await sendTx(kit, {
        chainId: ORI_CHAIN_ID,
        messages: [msg],
        autoSign,
        fee: autoSign ? buildAutoSignFee(400_000) : undefined,
      })
      const next = subs.filter((x) => x.creator !== s.creator)
      setSubs(next)
      writeJson(SUBS_KEY, next)
      toast.success('Subscription cancelled')
    } catch (e) {
      toast.error(friendlyError(e))
    }
  }

  const release = async (s: LocalSubscription) => {
    if (!initiaAddress) return
    try {
      const msg = msgReleaseSubscriptionPeriod({
        caller: initiaAddress,
        subscriber: initiaAddress,
        creator: s.creator,
      })
      await sendTx(kit, {
        chainId: ORI_CHAIN_ID,
        messages: [msg],
        autoSign,
        fee: autoSign ? buildAutoSignFee(500_000) : undefined,
      })
      toast.success('Period released')
    } catch (e) {
      toast.error(friendlyError(e))
    }
  }

  return (
    <AppShell title="Subscriptions">
      <div className="max-w-3xl space-y-10">
        <PageHeader
          kicker="· Subscriptions"
          title={
            <>
              Recurring, <Serif>by design</Serif>.
            </>
          }
          sub="Creators register a plan. Fans subscribe for N periods at a time. Release runs per-period so funds only leave the vault as service is rendered."
        />

        <div className="flex gap-2 p-1 rounded-full bg-white/[0.03] border border-[var(--color-border)] w-fit">
          <TabBtn active={tab === 'subscribe'} onClick={() => setTab('subscribe')}>
            Subscribe
          </TabBtn>
          <TabBtn active={tab === 'plan'} onClick={() => setTab('plan')}>
            My plan
          </TabBtn>
        </div>

        {tab === 'subscribe' && (
          <>
            <Card>
              <CardHeader>
                <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground font-mono">
                  Subscribe to a creator
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="creator-input">Creator</Label>
                  <Input
                    id="creator-input"
                    placeholder="mira.init"
                    value={creatorInput}
                    onChange={(e) => setCreatorInput(e.target.value)}
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    .init name or init1… address
                  </p>
                  {resolved && (
                    <div className="mt-1.5 text-[12px] text-[var(--color-success)]">
                      Resolved → {resolved.initName ?? resolved.initiaAddress}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Periods</Label>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setPeriods(Math.max(1, periods - 1))}
                    >
                      −
                    </Button>
                    <div className="flex-1 text-center font-mono text-[22px] tabular-nums">
                      {periods}
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setPeriods(periods + 1)}
                    >
                      +
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    How many periods to prepay
                  </p>
                </div>

                <Button
                  onClick={() => void subscribe()}
                  disabled={!resolved || periods < 1 || subBusy}
                  size="lg"
                  className="w-full"
                >
                  {subBusy ? 'Subscribing…' : 'Subscribe'}
                  <Repeat className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>

            <section className="space-y-3">
              <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground font-mono">
                Active subscriptions
              </div>
              {subs.length === 0 ? (
                <Card>
                  <EmptyState
                    icon={<Users className="w-5 h-5" />}
                    title="Not subscribed to anyone yet"
                    description="Subscribe to a creator above. Their plan will renew per period until you cancel."
                  />
                </Card>
              ) : (
                <div className="space-y-3">
                  {subs.map((s) => (
                    <Card key={s.creator} className="p-5 space-y-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="text-[11px] font-mono uppercase tracking-[0.12em] text-ink-3">
                            subscribed
                          </div>
                          <div className="mt-1 text-[15px] font-medium text-foreground font-mono">
                            {s.creatorName ??
                              `${s.creator.slice(0, 10)}…${s.creator.slice(-4)}`}
                          </div>
                        </div>
                        <Badge variant="secondary">{s.periods} period{s.periods === 1 ? '' : 's'}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => void release(s)}
                        >
                          <CalendarClock className="w-3.5 h-3.5" />
                          Release period
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => void cancel(s)}
                        >
                          <X className="w-3.5 h-3.5" />
                          Cancel
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        {tab === 'plan' && (
          myPlan ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground font-mono">
                    My plan
                  </div>
                  <Badge>active</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-2 gap-4 font-mono">
                  <Metric
                    label="price / period"
                    value={`${fromBaseUnits(BigInt(myPlan.price))} ${ORI_SYMBOL}`}
                  />
                  <Metric
                    label="period"
                    value={
                      PERIOD_PRESETS.find((p) => p.seconds === myPlan.periodSeconds)
                        ?.label ?? `${myPlan.periodSeconds}s`
                    }
                  />
                </div>
                <Button
                  variant="destructive"
                  onClick={() => void deactivatePlan()}
                  disabled={planBusy}
                  className="w-full"
                >
                  <X className="w-4 h-4" />
                  Deactivate plan
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground font-mono">
                  Register a plan
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="plan-price">{`Price per period (${ORI_SYMBOL})`}</Label>
                  <Input
                    id="plan-price"
                    placeholder="0"
                    inputMode="decimal"
                    value={planPrice}
                    onChange={(e) => setPlanPrice(e.target.value.replace(/[^0-9.]/g, ''))}
                    className="font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Period</Label>
                  <div className="flex flex-wrap gap-2">
                    {PERIOD_PRESETS.map((p) => (
                      <button
                        key={p.seconds}
                        type="button"
                        onClick={() => setPlanPeriod(p.seconds)}
                        className={cn(
                          'inline-flex items-center rounded-md border px-3 py-1 text-xs font-medium transition-colors cursor-pointer',
                          planPeriod === p.seconds
                            ? 'border-transparent bg-primary text-primary-foreground'
                            : 'border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground'
                        )}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
                <Button
                  onClick={() => void registerPlan()}
                  disabled={!planPrice || planBusy}
                  size="lg"
                  className="w-full"
                >
                  {planBusy ? 'Registering…' : 'Register plan'}
                  <Sparkles className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          )
        )}
      </div>
    </AppShell>
  )
}

function TabBtn({
  active,
  children,
  onClick,
}: {
  active: boolean
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={
        'px-4 py-1.5 text-[12.5px] rounded-full transition ' +
        (active
          ? 'bg-white/[0.06] text-foreground'
          : 'text-ink-3 hover:text-foreground')
      }
    >
      {children}
    </button>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-ink-3">
        {label}
      </span>
      <span className="mt-1 text-foreground tabular-nums">{value}</span>
    </div>
  )
}
