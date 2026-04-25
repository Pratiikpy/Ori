// SendArrowIcon — up-chevron in chat composers and thread input.
// Ports ASSETS.md §2.5 (source lines 1150, 1457). 16x16, currentColor stroke.

import { cn } from '@/lib/cn'

interface SendArrowIconProps {
  size?: number
  className?: string
}

export function SendArrowIcon({ size = 16, className }: SendArrowIconProps) {
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
      <path
        d="M8 12V4M4 8l4-4 4 4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
