import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface EyebrowProps {
  children: ReactNode
  className?: string
}

/**
 * Tiny uppercase mono label — the Ori.html "01 · Capabilities" pattern.
 * Paired above section titles and on field labels.
 */
export function Eyebrow({ children, className }: EyebrowProps) {
  return (
    <div
      className={cn(
        'font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3',
        className
      )}
    >
      {children}
    </div>
  )
}
