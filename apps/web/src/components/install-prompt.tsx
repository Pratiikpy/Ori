'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Share, Plus, X, Download } from 'lucide-react'

/**
 * PWA install prompt.
 *
 * Two branches because browser support splits sharply:
 *
 * 1. **Chromium (Android Chrome/Edge/Samsung/Opera)** — fires the standard
 *    `beforeinstallprompt` event. We capture it, stash the `prompt()` method,
 *    and wire it to our "Install" button so tapping actually triggers the
 *    native install UI.
 *
 * 2. **iOS Safari** — does NOT fire `beforeinstallprompt` at all. The only
 *    way to install is: Share sheet → Add to Home Screen. So we detect Safari
 *    + not-already-standalone and show manual instructions with the Share
 *    + Plus icons that match the iOS UI cues.
 *
 * Dismissal is persistent (`localStorage`) — this banner is one of those
 * "nice to have, never annoying" things. Once you say no, it's gone for good.
 *
 * Timing: we wait until the user has spent ~20 seconds in the app before
 * showing. That filters out bounces and avoids interrupting onboarding.
 */

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

const DISMISSED_KEY = 'ori.install-prompt-dismissed'
const SHOW_DELAY_MS = 20_000

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  // iOS exposes `navigator.standalone`; PWA spec exposes a display-mode MQ.
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in navigator && (navigator as Navigator & { standalone?: boolean }).standalone === true)
  )
}

function isIosSafari(): boolean {
  if (typeof window === 'undefined') return false
  const ua = window.navigator.userAgent
  const isIos = /iPad|iPhone|iPod/.test(ua)
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua)
  return isIos && isSafari
}

export function InstallPrompt() {
  const [visible, setVisible] = useState(false)
  const [deferredEvent, setDeferredEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [iosMode, setIosMode] = useState(false)
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (isStandalone()) return
    try {
      if (window.localStorage.getItem(DISMISSED_KEY)) return
    } catch {
      // No localStorage (private mode) — fall through and show each session;
      // still dismissible in-session.
    }

    const ios = isIosSafari()

    const onBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferredEvent(e as BeforeInstallPromptEvent)
      window.setTimeout(() => setVisible(true), SHOW_DELAY_MS)
    }

    if (ios) {
      // iOS: no event; just delay-show the manual instructions.
      setIosMode(true)
      const t = window.setTimeout(() => setVisible(true), SHOW_DELAY_MS)
      return () => window.clearTimeout(t)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall)
  }, [])

  const dismiss = () => {
    try {
      window.localStorage.setItem(DISMISSED_KEY, '1')
    } catch {
      // See localStorage note above.
    }
    setVisible(false)
  }

  const install = async () => {
    if (!deferredEvent) return
    try {
      await deferredEvent.prompt()
      const choice = await deferredEvent.userChoice
      if (choice.outcome === 'accepted') dismiss()
    } catch {
      // User-agent quirks — fail quietly, leave the banner.
    }
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-x-3 bottom-20 z-40 mx-auto max-w-sm"
          initial={prefersReducedMotion ? false : { opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 40 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        >
          <div className="relative rounded-2xl bg-background/95 backdrop-blur border border-border p-4 shadow-xl">
            <button
              onClick={dismiss}
              aria-label="Dismiss install prompt"
              className="absolute top-3 right-3 w-7 h-7 rounded-full inline-flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              <X className="w-3.5 h-3.5" />
            </button>

            <div className="flex items-start gap-3 pr-6">
              <div className="w-10 h-10 shrink-0 rounded-xl bg-primary/15 text-primary inline-flex items-center justify-center">
                <Download className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold">Install Ori</div>
                {iosMode ? (
                  <div className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    Tap{' '}
                    <Share className="inline w-3.5 h-3.5 align-text-top" />
                    {' '}then{' '}
                    <span className="font-medium text-foreground">
                      Add to Home Screen{' '}
                      <Plus className="inline w-3.5 h-3.5 align-text-top" />
                    </span>
                    . Messages, payments and agents open in one tap.
                  </div>
                ) : (
                  <div className="mt-1 text-xs text-muted-foreground">
                    One tap. No app store. Works offline.
                  </div>
                )}
              </div>
            </div>

            {!iosMode && deferredEvent && (
              <button
                onClick={() => void install()}
                className="mt-3 w-full rounded-xl py-2.5 bg-primary text-primary-foreground text-sm font-medium"
              >
                Install
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
