import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

type Tone = 'default' | 'ok' | 'warn' | 'accent'

interface PillProps {
  children: ReactNode
  tone?: Tone
  className?: string
}

const tones: Record<Tone, string> = {
  default: 'border-[var(--color-border-strong)] text-ink-2',
  ok: 'border-[var(--color-success)]/30 text-[var(--color-success)]',
  warn: 'border-[var(--color-warning)]/30 text-[var(--color-warning)]',
  accent: 'border-primary/35 text-primary-bright bg-primary/[0.08]',
}

export function Pill({ children, tone = 'default', className }: PillProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 border rounded-full px-2.5 py-[3px] text-[11px] leading-none font-mono',
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  )
}
