'use client'

import { useCallback } from 'react'
import { Delete } from 'lucide-react'
import { haptic } from '@/lib/haptics'

/**
 * Mobile-first big-number keypad. Cash App / Venmo pattern: the amount IS the
 * UI. The number is giant and tap targets are ~56px — fits thumbs without
 * zooming, and there's no system keyboard to bounce the viewport.
 *
 * The component is controlled — parent holds the decimal string and re-renders
 * on change. We accept a string (not a number) because "0.0", "0.", and ""
 * are distinct states during entry and only the parent decides how to display.
 */

export function BigNumberKeypad({
  value,
  onChange,
  maxDecimals = 6,
  className = '',
}: {
  value: string
  onChange: (next: string) => void
  maxDecimals?: number
  className?: string
}) {
  const press = useCallback(
    (k: string) => {
      haptic('tap')
      onChange(mutate(value, k, maxDecimals))
    },
    [value, onChange, maxDecimals],
  )

  return (
    <div className={`grid grid-cols-3 gap-2 select-none ${className}`}>
      {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'del'].map((k) => (
        <button
          key={k}
          type="button"
          onClick={() => press(k)}
          aria-label={k === 'del' ? 'Delete' : k === '.' ? 'Decimal' : `Digit ${k}`}
          className="h-14 rounded-2xl bg-muted/60 border border-border active:bg-primary/20 active:border-primary/40 text-xl font-semibold inline-flex items-center justify-center transition"
        >
          {k === 'del' ? <Delete className="w-5 h-5" /> : k}
        </button>
      ))}
    </div>
  )
}

/**
 * Pure string transform — keeps the keypad testable. Rules:
 *   - leading zeros are collapsed except "0.xxx"
 *   - only one decimal point, and only `maxDecimals` digits after it
 *   - empty string is allowed (user backspaced everything)
 */
export function mutate(current: string, key: string, maxDecimals: number): string {
  if (key === 'del') return current.slice(0, -1)

  if (key === '.') {
    if (current.includes('.')) return current
    if (current === '') return '0.'
    return current + '.'
  }

  // Digit.
  if (current === '0') return key === '0' ? '0' : key
  if (current.includes('.')) {
    const [, frac = ''] = current.split('.')
    if (frac.length >= maxDecimals) return current
  }
  return current + key
}
