'use client'

/**
 * Haptic feedback — iOS Safari ignores `navigator.vibrate` entirely and Android
 * Chrome honors it on user-gesture events only. Both behaviors are fine for our
 * use case (only firing on explicit tap). We gate on the API's existence and
 * the user's reduced-motion preference so it stays unobtrusive.
 *
 * Patterns are tuned by feel on a Pixel 8; iOS users get nothing, which is the
 * Apple-sanctioned fallback.
 */

type Pattern = 'tap' | 'confirm' | 'error'

const PATTERNS: Record<Pattern, number | number[]> = {
  tap: 10,
  confirm: [12, 40, 18],
  error: [30, 40, 30],
}

export function haptic(pattern: Pattern = 'tap'): void {
  if (typeof window === 'undefined') return
  const nav = window.navigator as Navigator & { vibrate?: (p: number | number[]) => boolean }
  if (typeof nav.vibrate !== 'function') return
  try {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (mq?.matches) return
    nav.vibrate(PATTERNS[pattern])
  } catch {
    // A synchronous throw here would mean a user-agent quirk we can't do
    // anything about. Silent catch is correct — haptics are pure polish.
  }
}
