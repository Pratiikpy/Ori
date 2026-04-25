// MoreDots — three open horizontal dots, chat-header right slot.
// Ports ASSETS.md §2.3 (source lines 1130-1132). 16x16, currentColor stroke.

import { cn } from '@/lib/cn'

interface MoreDotsProps {
  size?: number
  className?: string
}

export function MoreDots({ size = 16, className }: MoreDotsProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className={cn('inline-block', className)}
      aria-hidden="true"
    >
      <circle cx="3" cy="8" r="1" />
      <circle cx="8" cy="8" r="1" />
      <circle cx="13" cy="8" r="1" />
    </svg>
  )
}
