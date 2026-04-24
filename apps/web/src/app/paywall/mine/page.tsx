'use client'

/**
 * /paywall/mine — list the current account's paywalls with deactivate action.
 *
 * Reads from local cache populated at /paywall/new submit. Source of truth is
 * still the chain (each gate URL is independently verifiable), but without a
 * per-creator view function exposed in the public module we can't efficiently
 * enumerate them from the chain alone — so the create flow mirrors metadata
 * into localStorage and this page renders from that plus deactivate msgs.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useInterwovenKit } from '@initia/interwovenkit-react'
import { toast } from 'sonner'
import { Copy, ExternalLink, Lock, Plus, X } from 'lucide-react'

import { AppShell } from '@/components/app-shell'
import { PageHeader, Serif } from '@/components/page-header'
import {
  Button,
  Card,
  EmptyState,
  Eyebrow,
  Pill,
  Reveal,
} from '@/components/ui'
import { useAutoSign } from '@/hooks/use-auto-sign'
import {
  ORI_CHAIN_ID,
  ORI_DECIMALS,
  ORI_SYMBOL,
  APP_URL,
} from '@/lib/chain-config'
import { msgDeactivatePaywall } from '@/lib/contracts'
import { buildAutoSignFee, friendlyError, sendTx } from '@/lib/tx'

const STORAGE_KEY = 'ori.paywalls.mine.v1'

interface LocalPaywall {
  id: string
  title: string
  resourceUri: string
  price: string
  createdAt: number
  active: boolean
}

function readLocal(): LocalPaywall[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]') as LocalPaywall[]
  } catch {
    return []
  }
}
function writeLocal(v: LocalPaywall[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(v))
}

function fromBaseUnits(base: bigint, decimals = ORI_DECIMALS): string {
  const d = 10n ** BigInt(decimals)
  const whole = base / d
  const frac = (base % d).toString().padStart(decimals, '0').replace(/0+$/, '')
  return frac ? `${whole}.${frac}` : whole.toString()
}

export default function MyPaywallsPage() {
  const kit = useInterwovenKit()
  const { initiaAddress } = kit
  const { isEnabled: autoSign } = useAutoSign()

  const [items, setItems] = useState<LocalPaywall[]>([])

  useEffect(() => {
    setItems(readLocal())
  }, [])

  const deactivate = useCallback(
    async (id: string) => {
      if (!initiaAddress) return
      try {
        const msg = msgDeactivatePaywall({
          creator: initiaAddress,
          paywallId: BigInt(id),
        })
        await sendTx(kit, {
          chainId: ORI_CHAIN_ID,
          messages: [msg],
          autoSign,
          fee: autoSign ? buildAutoSignFee(400_000) : undefined,
        })
        const next = items.map((x) => (x.id === id ? { ...x, active: false } : x))
        setItems(next)
        writeLocal(next)
        toast.success('Deactivated')
      } catch (e) {
        toast.error(friendlyError(e))
      }
    },
    [initiaAddress, kit, autoSign, items]
  )

  const copy = async (id: string) => {
    const url = `${APP_URL}/paywall/${id}/pay`
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Link copied')
    } catch {
      toast.error('Copy failed — grab it from the address bar')
    }
  }

  const hasAny = useMemo(() => items.length > 0, [items])

  return (
    <AppShell title="My paywalls">
      <div className="max-w-2xl mx-auto w-full px-5 pt-8 pb-10 space-y-8">
        <PageHeader
          kicker="· Paywall · Mine"
          title={
            <>
              Your <Serif>gated</Serif> links.
            </>
          }
          sub="Everything you've put behind a one-time payment. Copy a URL to share, or deactivate to pull it from the index."
        />

        <div className="flex items-center justify-between">
          <Eyebrow>{items.length} total</Eyebrow>
          <Button href="/paywall/new" size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />}>
            New paywall
          </Button>
        </div>

        {!hasAny && (
          <Card>
            <EmptyState
              icon={<Lock className="w-5 h-5" />}
              title="No paywalls yet"
              description="Wrap any URL in a one-time purchase. Agents and humans pay the same way."
              action={
                <Button
                  href="/paywall/new"
                  size="md"
                  leftIcon={<Plus className="w-3.5 h-3.5" />}
                >
                  Create your first
                </Button>
              }
            />
          </Card>
        )}

        {hasAny && (
          <div className="space-y-3">
            {items.map((p) => {
              const payUrl = `${APP_URL}/paywall/${p.id}/pay`
              return (
                <Reveal key={p.id}>
                  <Card className="p-5 space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-mono uppercase tracking-[0.12em] text-ink-3">
                            #{p.id}
                          </span>
                          {p.active ? (
                            <Pill tone="ok">active</Pill>
                          ) : (
                            <Pill>inactive</Pill>
                          )}
                        </div>
                        <h3 className="mt-1.5 text-[16px] font-medium truncate">
                          {p.title}
                        </h3>
                        <Link
                          href={p.resourceUri}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 block font-mono text-[12px] text-ink-3 hover:text-ink-2 truncate"
                        >
                          {p.resourceUri}
                        </Link>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-mono text-[20px] tabular-nums text-foreground">
                          {fromBaseUnits(BigInt(p.price))}
                        </div>
                        <div className="text-[10px] font-mono uppercase tracking-[0.12em] text-ink-3">
                          {ORI_SYMBOL}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => void copy(p.id)}
                        leftIcon={<Copy className="w-3.5 h-3.5" />}
                      >
                        Copy link
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        href={payUrl}
                        target="_blank"
                        rightIcon={<ExternalLink className="w-3.5 h-3.5" />}
                      >
                        Preview
                      </Button>
                      {p.active && (
                        <Button
                          variant="danger"
                          size="sm"
                          className="ml-auto"
                          onClick={() => void deactivate(p.id)}
                          leftIcon={<X className="w-3.5 h-3.5" />}
                        >
                          Deactivate
                        </Button>
                      )}
                    </div>
                  </Card>
                </Reveal>
              )
            })}
          </div>
        )}
      </div>
    </AppShell>
  )
}
