// MailIcon — envelope, used as left action on WinThread head.
// Ports ASSETS.md §2.7 (source line 1434). 16x16, currentColor stroke.

import { cn } from '@/lib/cn'

interface MailIconProps {
  size?: number
  className?: string
}

export function MailIcon({ size = 16, className }: MailIconProps) {
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
      <path d="M2 5l6 4 6-4M2 5v6h12V5" strokeLinejoin="round" />
    </svg>
  )
}
