/**
 * GlassCard — the canonical content surface.
 *
 * Wraps the `.glass-card` CSS class so we don't repeat the
 * backdrop-filter+saturate chain at every call site (and also so we can
 * change card chrome in one place). `<GlassCard padding="lg">` etc. for
 * common sizing without arbitrary tailwind.
 */
import * as React from 'react'

type Padding = 'none' | 'sm' | 'md' | 'lg'

const PADDING_STYLES: Record<Padding, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
}

export interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: Padding
  /** Use the slimmer inner-card style (for nested compositions) */
  inner?: boolean
  as?: keyof React.JSX.IntrinsicElements
}

export function GlassCard({
  padding = 'md',
  inner = false,
  as: As = 'div',
  className = '',
  children,
  ...rest
}: GlassCardProps) {
  const Tag = As as 'div'
  return (
    <Tag
      className={[
        inner ? 'glass-inner' : 'glass-card',
        PADDING_STYLES[padding],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {children}
    </Tag>
  )
}
