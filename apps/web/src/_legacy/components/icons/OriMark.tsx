// OriMark — brand mark, two concentric circles. Used in topbar + footer.
// Ports ASSETS.md §2.1 / §8 (source lines 1074-1077, 1698). 24x24 viewBox.

import { cn } from '@/lib/cn'

interface OriMarkProps {
  size?: number
  className?: string
}

export function OriMark({ size = 24, className }: OriMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={cn('inline-block', className)}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="11" stroke="currentColor" strokeWidth="1.25" />
      <circle cx="12" cy="12" r="5" fill="currentColor" />
    </svg>
  )
}
