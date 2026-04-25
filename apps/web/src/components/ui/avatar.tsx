/**
 * Avatar — gradient placeholder + optional photo.
 *
 * A photo URL takes precedence; if absent or fails, we render a
 * deterministic gradient seeded by the `seed` string (initial avatar OR
 * an address). Same hash function is used everywhere so the same user
 * always gets the same gradient — provides visual identity continuity
 * across pages without requiring uploaded photos.
 */
import * as React from 'react'

type Size = 'sm' | 'md' | 'lg' | 'xl'

const SIZE_STYLES: Record<Size, { dim: string; text: string }> = {
  sm: { dim: 'w-8 h-8',   text: 'text-[12px]' },
  md: { dim: 'w-10 h-10', text: 'text-[14px]' },
  lg: { dim: 'w-14 h-14', text: 'text-[18px]' },
  xl: { dim: 'w-20 h-20', text: 'text-[24px]' },
}

function hashSeed(seed: string): number {
  return Array.from(seed).reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 0)
}

function gradient(seed: string): string {
  const hash = hashSeed(seed)
  const h1 = hash % 360
  const h2 = (h1 + 60) % 360
  return `linear-gradient(135deg, hsl(${h1} 70% 60%), hsl(${h2} 60% 50%))`
}

export interface AvatarProps {
  seed: string
  /** Optional photo URL — falls back to gradient on error */
  src?: string | null
  /** First letter overlay on gradient */
  initial?: string
  size?: Size
  className?: string
  /** Pulsing accent ring — for "active" indicator */
  active?: boolean
}

export function Avatar({
  seed,
  src,
  initial,
  size = 'md',
  className = '',
  active,
}: AvatarProps) {
  const [imgFailed, setImgFailed] = React.useState(false)
  const showImg = src && !imgFailed
  const { dim, text } = SIZE_STYLES[size]

  return (
    <div className={['relative inline-flex shrink-0', className].join(' ')}>
      {showImg ? (
        <img
          src={src!}
          alt=""
          className={[dim, 'rounded-full object-cover'].join(' ')}
          onError={() => setImgFailed(true)}
        />
      ) : (
        <div
          aria-hidden
          className={[
            dim,
            'rounded-full inline-flex items-center justify-center font-medium text-white',
            text,
          ].join(' ')}
          style={{ background: gradient(seed) }}
        >
          {initial?.[0]?.toUpperCase() ?? ''}
        </div>
      )}
      {active && (
        <span
          aria-hidden
          className="absolute inset-0 rounded-full ring-2 ring-[#007AFF] animate-pulse"
        />
      )}
    </div>
  )
}
