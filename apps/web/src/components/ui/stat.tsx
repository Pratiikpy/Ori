import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface StatProps {
  value: ReactNode
  label: ReactNode
  className?: string
}

/**
 * Stat row element — big mono number + uppercase label below.
 * Designed to sit inside a Card or a stats-ribbon row divided by 1px rules.
 */
export function Stat({ value, label, className }: StatProps) {
  return (
    <div className={cn('flex flex-col', className)}>
      <span className="font-mono text-[26px] leading-none tracking-tight text-foreground tabular-nums">
        {value}
      </span>
      <span className="mt-2 font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-3">
        {label}
      </span>
    </div>
  )
}

interface StatRibbonProps {
  children: ReactNode
  className?: string
}

export function StatRibbon({ children, className }: StatRibbonProps) {
  return (
    <div
      className={cn(
        'flex items-stretch gap-0 border-y border-[var(--color-border)] py-5',
        '[&>*]:flex-1 [&>*]:px-5 [&>*+*]:border-l [&>*+*]:border-[var(--color-border)]',
        className
      )}
    >
      {children}
    </div>
  )
}
