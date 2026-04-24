'use client'

import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean
  children: ReactNode
}

export function Chip({ selected, className, children, ...rest }: ChipProps) {
  return (
    <button
      type="button"
      className={cn(
        'font-mono text-[13px] rounded-full px-3.5 py-2 border transition-all duration-200',
        'active:scale-[0.98]',
        selected
          ? 'bg-primary/[0.15] border-primary/45 text-primary-bright'
          : 'bg-white/[0.025] border-[var(--color-border-strong)] text-ink-2 hover:border-[var(--color-border-emphasis)] hover:text-foreground',
        className
      )}
      {...rest}
    >
      {children}
    </button>
  )
}
