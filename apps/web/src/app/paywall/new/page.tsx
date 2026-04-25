'use client'

/**
 * /paywall/new — create a new paywall (paywall module).
 *
 * msgCreatePaywall(title, resourceUri, price, denom).
 * After broadcast, extract PaywallCreated event to get the id, then route
 * to a shareable URL the creator can post anywhere.
 */
import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useInterwovenKit } from '@initia/interwovenkit-react'
import { toast } from 'sonner'
import { ExternalLink, Lock } from 'lucide-react'

import { AppShell } from '@/components/app-shell'
import { PageHeader, Serif } from '@/components/page-header'
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Eyebrow,
  Field,
  Input,
  Pill,
  Reveal,
} from '@/components/ui'
import { useAutoSign } from '@/hooks/use-auto-sign'
import {
  ORI_CHAIN_ID,
  ORI_DECIMALS,
  ORI_DENOM,
  ORI_SYMBOL,
} from '@/lib/chain-config'
import { msgCreatePaywall } from '@/lib/contracts'
import {
  buildAutoSignFee,
  extractMoveEventData,
  friendlyError,
  sendTx,
} from '@/lib/tx'

const STORAGE_KEY = 'ori.paywalls.mine.v1'

export interface LocalPaywall {
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

function toBaseUnits(human: string, decimals = ORI_DECIMALS): bigint {
  if (!human) return 0n
  const [whole, fracRaw = ''] = human.split('.') as [string, string?]
  const frac = (fracRaw + '0'.repeat(decimals)).slice(0, decimals)
  return BigInt(whole || '0') * 10n ** BigInt(decimals) + BigInt(frac || '0')
}

export default function NewPaywallPage() {
  const router = useRouter()
  const kit = useInterwovenKit()
  const { initiaAddress, isConnected, openConnect } = kit
  const { isEnabled: autoSign } = useAutoSign()

  const [title, setTitle] = useState('')
  const [resourceUri, setResourceUri] = useState('')
  const [price, setPrice] = useState('')
  const [busy, setBusy] = useState(false)

  const handleCreate = useCallback(async () => {
    if (!isConnected) return openConnect()
    if (!initiaAddress) return
    const priceBase = toBaseUnits(price)
    if (priceBase <= 0n) {
      toast.error('Price must be positive')
      return
    }
    if (!title.trim()) {
      toast.error('Give it a title')
      return
    }
    if (!resourceUri.trim()) {
      toast.error('Content URL is required')
      return
    }

    setBusy(true)
    try {
      const msg = msgCreatePaywall({
        creator: initiaAddress,
        title: title.trim(),
        resourceUri: resourceUri.trim(),
        price: priceBase,
        denom: ORI_DENOM,
      })
      const res = await sendTx(kit, {
        chainId: ORI_CHAIN_ID,
        messages: [msg],
        autoSign,
        fee: autoSign ? buildAutoSignFee(600_000) : undefined,
      })
      const ev = extractMoveEventData(res.rawResponse, '::paywall::PaywallCreated')
      const id =
        (ev?.paywall_id as string | undefined) ??
        (ev?.id as string | undefined) ??
        Date.now().toString()

      const existing = readLocal()
      const next: LocalPaywall[] = [
        {
          id,
          title: title.trim(),
          resourceUri: resourceUri.trim(),
          price: priceBase.toString(),
          createdAt: Math.floor(Date.now() / 1000),
          active: true,
        },
        ...existing,
      ]
      writeLocal(next)
      toast.success('Paywall live')
      router.push('/paywall/mine')
    } catch (e) {
      toast.error(friendlyError(e))
    } finally {
      setBusy(false)
    }
  }, [
    isConnected,
    initiaAddress,
    price,
    title,
    resourceUri,
    kit,
    autoSign,
    router,
    openConnect,
  ])

  return (
    <AppShell title="New paywall">
      <div className="max-w-2xl mx-auto space-y-8">
        <PageHeader
          kicker="· Paywall · New"
          title={
            <>
              Gate a URL <Serif>behind a price</Serif>.
            </>
          }
          sub="Anyone paying the price once unlocks the resource. Speaks x402 HTTP 402 so AI agents can unlock it too, under the user's daily cap."
        />

        <Reveal>
          <Card>
            <CardHeader className="flex items-center justify-between">
              <Eyebrow>Paywall details</Eyebrow>
              <Pill>
                <Lock className="w-3 h-3" />
                x402
              </Pill>
            </CardHeader>
            <CardBody className="space-y-5">
              <Field label="Title" hint="What readers see on the gate">
                <Input
                  placeholder="e.g. Lisbon at 4am — the director's cut"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={80}
                />
              </Field>

              <Field
                label="Content URL"
                hint="The URL that unlocks after purchase. Your server should check receipt on chain."
              >
                <Input
                  placeholder="https://mira.films/lisbon-at-4am/full"
                  value={resourceUri}
                  onChange={(e) => setResourceUri(e.target.value)}
                  className="font-mono text-[13px]"
                />
              </Field>

              <Field label={`One-time price (${ORI_SYMBOL})`}>
                <Input
                  placeholder="0"
                  inputMode="decimal"
                  value={price}
                  onChange={(e) => setPrice(e.target.value.replace(/[^0-9.]/g, ''))}
                  className="font-mono"
                />
              </Field>

              <div className="flex items-center gap-3 pt-1">
                <Button
                  onClick={() => void handleCreate()}
                  loading={busy}
                  size="lg"
                  className="flex-1"
                  rightIcon={<ExternalLink className="w-4 h-4" />}
                >
                  {busy ? 'Publishing…' : 'Publish paywall'}
                </Button>
                <Button href="/paywall/mine" variant="secondary" size="lg">
                  My paywalls
                </Button>
              </div>
            </CardBody>
          </Card>
        </Reveal>
      </div>
    </AppShell>
  )
}
