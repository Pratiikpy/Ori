import { cn } from '@/lib/cn'

type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

interface AvatarProps {
  name: string
  size?: Size
  className?: string
  /** If true, adds a 3px page-bg border + soft shadow (for hero-sized profile photo). */
  hero?: boolean
}

const sizes: Record<Size, string> = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-[11px]',
  md: 'h-10 w-10 text-[13px]',
  lg: 'h-14 w-14 text-[16px]',
  xl: 'h-[104px] w-[104px] text-[38px]',
}

/**
 * Deterministic 2-color gradient from a name hash — matches Ori.html behavior.
 * Each name always maps to the same gradient so avatars feel stable.
 */
function gradientFor(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) {
    h = (h << 5) - h + name.charCodeAt(i)
    h |= 0
  }
  const hue1 = Math.abs(h) % 360
  const hue2 = (hue1 + 55) % 360
  return `linear-gradient(135deg, hsl(${hue1} 62% 52%) 0%, hsl(${hue2} 62% 38%) 100%)`
}

export function Avatar({ name, size = 'md', className, hero }: AvatarProps) {
  const letter = (name?.trim()?.[0] ?? '?').toUpperCase()
  return (
    <span
      aria-label={name}
      className={cn(
        'inline-flex items-center justify-center rounded-full font-medium text-white/95 shrink-0',
        sizes[size],
        hero &&
          'ring-[3px] ring-[var(--color-background)] shadow-[0_12px_40px_rgba(0,0,0,0.4)]',
        className
      )}
      style={{ background: gradientFor(name || 'anon') }}
    >
      {letter}
    </span>
  )
}
