import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface SectionHeadProps {
  eyebrow?: ReactNode
  title: ReactNode
  /** Secondary line, 440px max-width, muted. */
  sub?: ReactNode
  /** Aligns eyebrow+title left, sub right on desktop (Ori.html pattern). */
  layout?: 'stacked' | 'split'
  className?: string
}

export function SectionHead({
  eyebrow,
  title,
  sub,
  layout = 'split',
  className,
}: SectionHeadProps) {
  return (
    <div
      className={cn(
        layout === 'split'
          ? 'flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 lg:gap-16'
          : 'flex flex-col gap-6',
        className
      )}
    >
      <div>
        {eyebrow && (
          <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3 mb-5">
            {eyebrow}
          </div>
        )}
        <h2 className="text-[clamp(32px,4.5vw,60px)] font-medium tracking-[-0.03em] leading-[1.05] text-foreground max-w-[14ch]">
          {title}
        </h2>
      </div>
      {sub && (
        <p className="text-[17px] leading-[1.55] text-ink-2 max-w-[440px]">
          {sub}
        </p>
      )}
    </div>
  )
}

/** Inline italic serif accent for use inside titles. */
export function Serif({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <span className={cn('font-serif', className)}>{children}</span>
}
