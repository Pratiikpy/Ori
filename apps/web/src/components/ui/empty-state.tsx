import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface EmptyStateProps {
  icon?: ReactNode
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  className?: string
}

/**
 * Editorial empty state — eyebrow line above, centered headline + muted sub.
 * Matches the "editorial empty states" visual language in the landing.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center py-14 px-6',
        className
      )}
    >
      {icon && (
        <div className="mb-5 inline-flex items-center justify-center h-12 w-12 rounded-full bg-white/[0.03] border border-[var(--color-border-strong)] text-ink-3">
          {icon}
        </div>
      )}
      <div className="text-[20px] font-medium tracking-[-0.01em] text-foreground">
        {title}
      </div>
      {description && (
        <p className="mt-2 text-[14px] leading-[1.55] text-ink-3 max-w-[360px]">
          {description}
        </p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}
