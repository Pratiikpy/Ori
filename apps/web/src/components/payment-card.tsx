'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Check, ExternalLink } from 'lucide-react'
import { ORI_DECIMALS, ORI_SYMBOL } from '@/lib/chain-config'

export type PaymentCardData = {
  direction: 'sent' | 'received'
  amount: bigint
  denom: string
  memo?: string
  txHash?: string
  timestampMs?: number
}

const FIRST_RECEIVE_KEY = 'ori.first-receive-celebrated'

export function PaymentCard({ data }: { data: PaymentCardData }) {
  const display = formatAmount(data.amount, data.denom)
  const isSent = data.direction === 'sent'
  const scanUrl = data.txHash ? `https://scan.testnet.initia.xyz/ori-1/txs/${data.txHash}` : null
  const prefersReducedMotion = useReducedMotion()

  // B1: fire confetti exactly once — first time the user ever sees a received
  // card. localStorage flag persists across sessions so we don't re-celebrate.
  const [celebrate, setCelebrate] = useState(false)
  const didCheckRef = useRef(false)
  useEffect(() => {
    if (didCheckRef.current) return
    didCheckRef.current = true
    if (isSent) return
    if (typeof window === 'undefined') return
    try {
      if (window.localStorage.getItem(FIRST_RECEIVE_KEY)) return
      window.localStorage.setItem(FIRST_RECEIVE_KEY, '1')
      setCelebrate(true)
    } catch {
      // localStorage unavailable (Safari private mode, etc.) — skip silently;
      // the celebration is pure delight, not functional.
    }
  }, [isSent])

  const slideFrom = isSent ? 24 : -24

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, x: slideFrom, scale: 0.96 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 320, damping: 26, mass: 0.9 }}
      className={
        'relative rounded-2xl px-4 py-3 max-w-[82%] break-words ' +
        (isSent
          ? 'ml-auto bg-primary/15 border border-primary/30'
          : 'bg-success/15 border border-success/30')
      }
    >
      {celebrate && !prefersReducedMotion && <ConfettiBurst />}
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs uppercase tracking-wide text-muted-foreground">
          {isSent ? 'You paid' : 'You received'}
        </span>
        <Check className={isSent ? 'w-4 h-4 text-primary' : 'w-4 h-4 text-success'} />
      </div>
      <div className="mt-1 text-2xl font-bold">{display}</div>
      {data.memo && <div className="mt-1 text-sm opacity-90">{data.memo}</div>}
      {scanUrl && (
        <a
          href={scanUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="mt-2 inline-flex items-center gap-1 text-[11px] text-muted-foreground font-mono hover:text-foreground"
        >
          {data.txHash!.slice(0, 12)}… <ExternalLink className="w-3 h-3" />
        </a>
      )}
    </motion.div>
  )
}

// Dependency-free confetti — 14 emoji particles animated with framer-motion.
// Plays once, then unmounts so it doesn't keep compositing layers around.
function ConfettiBurst() {
  const particles = useMemo(() => {
    const glyphs = ['🎉', '✨', '💸', '🎊']
    return Array.from({ length: 14 }, (_, i) => ({
      id: i,
      glyph: glyphs[i % glyphs.length],
      dx: (Math.random() - 0.5) * 280,
      dy: -(80 + Math.random() * 140),
      rot: (Math.random() - 0.5) * 360,
      delay: Math.random() * 0.08,
    }))
  }, [])
  const [alive, setAlive] = useState(true)
  useEffect(() => {
    const t = setTimeout(() => setAlive(false), 1600)
    return () => clearTimeout(t)
  }, [])
  if (!alive) return null
  return (
    <div className="pointer-events-none absolute inset-0 overflow-visible z-10">
      {particles.map((p) => (
        <motion.span
          key={p.id}
          className="absolute left-1/2 top-1/2 text-base select-none"
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
          animate={{ x: p.dx, y: p.dy, opacity: 0, rotate: p.rot }}
          transition={{ duration: 1.2, delay: p.delay, ease: [0.22, 1, 0.36, 1] }}
        >
          {p.glyph}
        </motion.span>
      ))}
    </div>
  )
}

function formatAmount(amount: bigint, denom: string): string {
  const decimals = denom === 'umin' || denom === 'uinit' ? 6 : ORI_DECIMALS
  const whole = amount / 10n ** BigInt(decimals)
  const frac = amount % 10n ** BigInt(decimals)
  const fracStr = frac
    .toString()
    .padStart(decimals, '0')
    .replace(/0+$/, '')
  const symbol = denom.startsWith('u') ? denom.slice(1).toUpperCase() : denom.toUpperCase()
  return `${whole}${fracStr ? '.' + fracStr : ''} ${symbol || ORI_SYMBOL}`
}
