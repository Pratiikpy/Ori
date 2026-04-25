'use client'

/**
 * OnboardingBanner — a dismissible 3-step primer shown on /chats for
 * first-time users. Dismissal is persisted in localStorage; re-showing is
 * opt-in via the "Show tips again" link in Settings (future).
 *
 * Design: narrow card, clear ordered steps, never blocks the feed.
 */
import { useEffect, useState } from 'react'
import { X, Sparkles, Zap, AtSign } from 'lucide-react'

const DISMISS_KEY = 'ori.onboarding_banner.dismissed'

export function OnboardingBanner({
  hasClaimed,
  hasKeypair,
  hasSentPayment,
}: {
  hasClaimed: boolean
  hasKeypair: boolean
  hasSentPayment: boolean
}) {
  const [mounted, setMounted] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    setMounted(true)
    try {
      setDismissed(window.localStorage.getItem(DISMISS_KEY) === '1')
    } catch {
      /* ignore */
    }
  }, [])

  if (!mounted || dismissed) return null

  const dismiss = () => {
    setDismissed(true)
    try {
      window.localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      /* ignore */
    }
  }

  const steps = [
    {
      icon: <AtSign className="w-4 h-4" />,
      label: 'Claim your .init',
      done: hasClaimed,
      hint: 'Your .init is how friends pay you.',
    },
    {
      icon: <Sparkles className="w-4 h-4" />,
      label: 'Unlock encryption',
      done: hasKeypair,
      hint: 'Sign once so messages stay private.',
    },
    {
      icon: <Zap className="w-4 h-4" />,
      label: 'Send your first payment',
      done: hasSentPayment,
      hint: 'In a chat, tap $. Zero popups.',
    },
  ]

  const allDone = steps.every((s) => s.done)
  if (allDone) return null

  return (
    <div className="mx-3 mt-3 rounded-2xl border border-primary/30 bg-primary/5 p-4 relative">
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute top-2 right-2 w-7 h-7 rounded-full inline-flex items-center justify-center text-muted-foreground hover:bg-muted"
      >
        <X className="w-3.5 h-3.5" />
      </button>
      <h3 className="text-sm font-semibold">Welcome to Ori</h3>
      <p className="text-xs text-muted-foreground">Finish the setup in 30 seconds.</p>

      <ol className="mt-3 space-y-2">
        {steps.map((s, idx) => (
          <li
            key={idx}
            className={
              'flex items-center gap-3 rounded-xl border px-3 py-2 ' +
              (s.done ? 'border-success/30 bg-success/5' : 'border-border bg-background')
            }
          >
            <div
              className={
                'w-8 h-8 rounded-lg inline-flex items-center justify-center flex-none ' +
                (s.done ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground')
              }
            >
              {s.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{s.label}</div>
              <div className="text-[11px] text-muted-foreground truncate">{s.hint}</div>
            </div>
            <div className="text-[11px] font-mono">
              {s.done ? (
                <span className="text-success">✓</span>
              ) : (
                <span className="text-muted-foreground">{idx + 1}</span>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}
