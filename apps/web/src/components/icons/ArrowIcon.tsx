// ArrowIcon — right-chevron used on nav CTA, hero "Open the app", send CTA.
// Ports ASSETS.md §2.2 (source lines 1088, 1115, 1489). 16x16, currentColor stroke.

import { cn } from '@/lib/cn'

type Direction = 'right' | 'up' | 'down' | 'left'

interface ArrowIconProps {
  size?: number
  className?: string
  direction?: Direction
}

const rotations: Record<Direction, string> = {
  right: 'rotate-0',
  up: '-rotate-90',
  down: 'rotate-90',
  left: 'rotate-180',
}

export function ArrowIcon({
  size = 16,
  className,
  direction = 'right',
}: ArrowIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className={cn('inline-block', rotations[direction], className)}
      aria-hidden="true"
    >
      <path
        d="M3 8h10M9 4l4 4-4 4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
