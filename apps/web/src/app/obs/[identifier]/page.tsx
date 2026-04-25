'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { resolve } from '@/lib/resolve'
import { API_URL, ORI_DECIMALS, ORI_SYMBOL } from '@/lib/chain-config'

type Tip = {
  id: number
  tipperDisplay: string
  amountDisplay: string
  message: string
}

/**
 * OBS browser-source overlay. Transparent background + absolute-positioned
 * toast stack so streamers can drop this page in as a layer without extra CSS.
 *
 * Listens to:  GET /v1/obs/stream/:creatorAddress (SSE)
 */
export default function OBSOverlayPage() {
  const { identifier } = useParams<{ identifier: string }>()
  const [address, setAddress] = useState<string | null>(null)
  const [tips, setTips] = useState<Tip[]>([])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!identifier) return
      const r = await resolve(decodeURIComponent(identifier)).catch(() => null)
      if (!cancelled) setAddress(r?.initiaAddress ?? null)
    })()
    return () => {
      cancelled = true
    }
  }, [identifier])

  useEffect(() => {
    if (!address) return
    const url = `${API_URL}/v1/obs/stream/${address}`
    const es = new EventSource(url)
    let idCounter = 0

    es.addEventListener('tip', (evt: MessageEvent) => {
      try {
        const data = JSON.parse(evt.data) as {
          tipper?: string
          netAmount?: string
          denom?: string
          message?: string
        }
        const amount = baseUnitsToDisplay(data.netAmount ?? '0', data.denom ?? '')
        const tipperDisplay = shortenAddress(data.tipper ?? '?')
        const tip: Tip = {
          id: ++idCounter,
          tipperDisplay,
          amountDisplay: amount,
          message: data.message ?? '',
        }
        setTips((prev) => [...prev, tip])
        setTimeout(() => {
          setTips((prev) => prev.filter((t) => t.id !== tip.id))
        }, 6000)
      } catch {
        /* ignore malformed events */
      }
    })

    return () => {
      es.close()
    }
  }, [address])

  return (
    <div
      className="min-h-dvh w-full flex items-end justify-start p-6"
      style={{ background: 'transparent' }}
    >
      <div className="flex flex-col-reverse gap-2 w-full max-w-md">
        <AnimatePresence>
          {tips.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: -20, scale: 0.98 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.25 }}
              className="rounded-2xl px-4 py-3 bg-black/70 backdrop-blur text-white shadow-2xl border border-white/10"
            >
              <div className="flex items-baseline gap-2">
                <span className="text-primary font-bold">{t.tipperDisplay}</span>
                <span className="text-white/70 text-sm">tipped</span>
                <span className="font-bold">{t.amountDisplay}</span>
              </div>
              {t.message && (
                <div className="mt-1 text-sm text-white/90">&ldquo;{t.message}&rdquo;</div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}

function shortenAddress(addr: string): string {
  if (!addr) return ''
  if (addr.length < 14) return addr
  return `${addr.slice(0, 10)}…${addr.slice(-4)}`
}

function baseUnitsToDisplay(baseStr: string, denom: string): string {
  const decimals = denom === 'umin' || denom === 'uinit' ? 6 : ORI_DECIMALS
  try {
    const base = BigInt(baseStr)
    const whole = base / 10n ** BigInt(decimals)
    const frac = base % 10n ** BigInt(decimals)
    const fracStr = frac.toString().padStart(decimals, '0').replace(/0+$/, '')
    const symbol = denom.startsWith('u') ? denom.slice(1).toUpperCase() : ORI_SYMBOL
    return `${whole}${fracStr ? '.' + fracStr : ''} ${symbol}`
  } catch {
    return `${baseStr} ${denom}`
  }
}
