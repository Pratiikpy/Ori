// SearchIcon — magnifier used in WinChats search input.
// Ports ASSETS.md §2.6 (source line 1369). 16x16, currentColor stroke.

import { cn } from '@/lib/cn'

interface SearchIconProps {
  size?: number
  className?: string
}

export function SearchIcon({ size = 16, className }: SearchIconProps) {
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
      <circle cx="7" cy="7" r="4.5" />
      <path d="M14 14l-3.5-3.5" strokeLinecap="round" />
    </svg>
  )
}
