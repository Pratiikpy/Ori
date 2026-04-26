'use client'

/**
 * Paywall purchase UI — in-app flow for clicking "Unlock" from the x402 gate.
 *
 * The gate itself (../route.ts) is headless — it returns 402 or content. This
 * page is the human-friendly companion: connects a wallet, reads the paywall
 * price, calls `paywall::purchase(paywall_id)`, and then redirects back to
 * the gated URL with `?buyer=<addr>` so the content renders.
 */
import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useInterwovenKit } from '@initia/interwovenkit-react'
import { bcs } from '@initia/initia.js'
import { toast } from 'sonner'
import { ArrowRight, Loader2, Lock } from 'lucide-react'

import { AppShell } from '@/components/app-shell'
import { ORI_CHAIN_ID, ORI_DENOM, ORI_SYMBOL, ORI_MODULE_ADDRESS, ORI_REST_URL } from '@/lib/chain-config'
import { msgPurchasePaywall } from '@/lib/contracts'
import { buildAutoSignFee, sendTx } from '@/lib/tx'
import { useAutoSign } from '@/hooks/use-auto-sign'

type Paywall = {
  creator: string
  title: string
  resourceUri: string
  price: string
  denom: string
  active: boolean
}

export default function PaywallPayPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const kit = useInterwovenKit()
  const { initiaAddress, isConnected, openConnect } = kit
  const { isEnabled: autoSign } = useAutoSign()

  const [pw, setPw] = useState<Paywall | null>(null)
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)

  const paywallId = useMemo(() => {
    try {
      return BigInt(id ?? '0')
    } catch {
      return 0n
    }
  }, [id])

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        // Query the Move view fn directly via the REST endpoint. We could also
        // proxy through our own API, but hitting the chain keeps the path
        // self-contained and matches what agents inspecting the gate see.
        // BCS u64 is little-endian. The original hand-rolled encoding put the
        // low byte at position 7 (big-endian), which made `id=15` look like
        // (15 << 56) on chain — paywall would never be found. Use the BCS
        // helper so the encoding matches what the contract expects.
        const idArg = bcs.u64().serialize(paywallId.toString()).toBase64()
        const res = await fetch(`${ORI_REST_URL}/initia/move/v1/accounts/${ORI_MODULE_ADDRESS}/modules/paywall/view_functions/get_paywall`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type_args: [],
            args: [idArg],
          }),
        })
        const body = (await res.json()) as { data?: unknown }
        const parsed = typeof body.data === 'string' ? JSON.parse(body.data) : body.data
        if (!Array.isArray(parsed)) throw new Error('unexpected shape')
        const [creator, title, resource_uri, price, denom, , , active] = parsed as [
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          boolean,
        ]
        if (!cancelled) {
          setPw({ creator, title, resourceUri: resource_uri, price, denom, active })
        }
      } catch {
        if (!cancelled) setPw(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [paywallId])

  const purchase = async () => {
    if (!isConnected) {
      openConnect()
      return
    }
    if (!initiaAddress) return
    setPaying(true)
    try {
      const msg = msgPurchasePaywall({ buyer: initiaAddress, paywallId })
      await sendTx(kit, {
        chainId: ORI_CHAIN_ID,
        messages: [msg],
        autoSign,
        fee: autoSign ? buildAutoSignFee(500_000) : undefined,
      })
      toast.success('Unlocked')
      // Redirect back to the gate with our address so the content renders.
      router.push(`/paywall/${id}?buyer=${encodeURIComponent(initiaAddress)}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Purchase failed')
    } finally {
      setPaying(false)
    }
  }

  const priceDisplay = useMemo(() => {
    if (!pw) return '—'
    const d = pw.denom === 'umin' || pw.denom === 'uinit' ? 6 : 6
    const n = BigInt(pw.price || '0')
    const whole = n / 10n ** BigInt(d)
    const frac = n % 10n ** BigInt(d)
    const fracStr = frac.toString().padStart(d, '0').replace(/0+$/, '')
    const sym = pw.denom.startsWith('u') ? pw.denom.slice(1).toUpperCase() : pw.denom.toUpperCase()
    return `${whole}${fracStr ? '.' + fracStr : ''} ${sym || ORI_SYMBOL}`
  }, [pw])

  return (
    <AppShell title="Paywall" hideNav>
      <div className="max-w-md mx-auto py-8">
        {loading && <div className="text-xs text-muted-foreground">Reading paywall from chain…</div>}
        {!loading && !pw && <div className="text-danger">Paywall not found</div>}
        {pw && (
          <div className="rounded-2xl border border-border bg-muted/30 p-6">
            <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-wide text-muted-foreground">
              <Lock className="w-3 h-3" /> x402 gated · ID #{id}
            </div>
            <h1 className="mt-2 text-xl font-bold">{pw.title}</h1>
            <p className="mt-1 text-xs text-muted-foreground font-mono break-all">
              Creator: {pw.creator.slice(0, 14)}…{pw.creator.slice(-6)}
            </p>
            <div className="mt-5 text-4xl font-bold tracking-tight">
              {priceDisplay}
              <span className="ml-2 text-sm text-muted-foreground font-normal">one-time</span>
            </div>
            <button
              onClick={() => void purchase()}
              disabled={paying || !pw.active}
              className="mt-6 w-full rounded-2xl py-3 bg-primary text-primary-foreground font-medium disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              {paying && <Loader2 className="w-4 h-4 animate-spin" />}
              {paying ? 'Unlocking…' : pw.active ? `Unlock${autoSign ? ' · 1-tap' : ''}` : 'Inactive'}
              <ArrowRight className="w-4 h-4" />
            </button>
            <p className="mt-4 text-[11px] text-muted-foreground">
              After the tx lands you'll be redirected to the content.
            </p>
          </div>
        )}
      </div>
    </AppShell>
  )
}
