'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Zap, MessageCircle, Fingerprint, X } from 'lucide-react'

const SEEN_KEY = 'ori.first-payment-overlay-seen'

/**
 * One-time welcome shown the first time a user lands on /send. Explains what
 * makes Ori payments feel different before they tap the button. Dismiss is
 * persistent — we never show it again for this browser, even if they uninstall
 * and reinstall the PWA (localStorage survives).
 *
 * Intentionally lightweight: no route changes, no backend trip. It's purely
 * a perception device — judges and first-time users see the three pillars
 * (invisible, inline, identity) in plain language.
 */
export function FirstPaymentOverlay() {
  const [open, setOpen] = useState(false)
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      if (window.localStorage.getItem(SEEN_KEY)) return
      setOpen(true)
    } catch {
      // localStorage unavailable — skip silently. Not worth showing an overlay
      // we can't dismiss persistently.
    }
  }, [])

  const dismiss = () => {
    try {
      window.localStorage.setItem(SEEN_KEY, '1')
    } catch {
      // See note above.
    }
    setOpen(false)
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={dismiss}
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={prefersReducedMotion ? false : { y: 40, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { y: 40, opacity: 0, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="relative w-full max-w-md rounded-3xl bg-background border border-border p-6 shadow-2xl"
          >
            <button
              onClick={dismiss}
              aria-label="Close"
              className="absolute top-4 right-4 w-8 h-8 rounded-full inline-flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              First send on Ori
            </div>
            <h2 className="mt-2 text-2xl font-bold leading-tight">
              Three things about paying here.
            </h2>

            <ul className="mt-5 space-y-4">
              <Row
                icon={<Fingerprint className="w-5 h-5" />}
                title="Pay a name, not an address."
                body={
                  <>
                    Type <span className="font-mono">alice.init</span> — Ori
                    resolves it on L1. Paste-a-0x-hex is gone.
                  </>
                }
              />
              <Row
                icon={<Zap className="w-5 h-5" />}
                title="Settles in ~100 ms, no popup."
                body="Auto-sign grants one-tap authority for 24h. After that, every send is zero-click — the money just moves."
              />
              <Row
                icon={<MessageCircle className="w-5 h-5" />}
                title="Lands inside the conversation."
                body="The payment card appears in your chat with them, not on some other tab. Messages and money are the same surface."
              />
            </ul>

            <button
              onClick={dismiss}
              className="mt-6 w-full rounded-2xl py-3 bg-primary text-primary-foreground font-medium"
            >
              Got it — send my first one
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function Row({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode
  title: string
  body: React.ReactNode
}) {
  return (
    <li className="flex items-start gap-3">
      <div className="w-9 h-9 shrink-0 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
        {icon}
      </div>
      <div>
        <div className="font-semibold">{title}</div>
        <div className="text-sm text-muted-foreground">{body}</div>
      </div>
    </li>
  )
}
