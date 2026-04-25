import { cn } from '@/lib/cn'

interface VerifiedBadgeProps {
  size?: number
  className?: string
}

/**
 * Eight-pointed scalloped burst with a white checkmark.
 * Pixel-lifted from Ori.html line ~1520. Inline SVG, no icon library.
 */
export function VerifiedBadge({ size = 22, className }: VerifiedBadgeProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={cn('inline-block align-middle', className)}
      aria-label="Verified"
      role="img"
    >
      <path
        d="M12 1.6 14.1 3.1 16.5 2.4 17.6 4.7 20.1 5.4 19.9 8 21.8 9.7 20.7 12 21.8 14.3 19.9 16 20.1 18.6 17.6 19.3 16.5 21.6 14.1 20.9 12 22.4 9.9 20.9 7.5 21.6 6.4 19.3 3.9 18.6 4.1 16 2.2 14.3 3.3 12 2.2 9.7 4.1 8 3.9 5.4 6.4 4.7 7.5 2.4 9.9 3.1Z"
        fill="var(--color-primary)"
      />
      <path
        d="M7.8 12.2 10.6 15 16.4 9.2"
        stroke="#ffffff"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  )
}
