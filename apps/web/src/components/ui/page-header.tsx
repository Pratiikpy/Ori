/**
 * PageHeader — the canonical top-of-page block.
 *
 * Reference Apple-style: large display title (Outfit 32-48px), single-line
 * tagline, optional `actions` slot for primary CTAs that hang on the right.
 * No mono eyebrow, no italic serif accent — that was the dark-Linear era.
 *
 * On mobile the actions stack below the title; on md+ they sit flex-row
 * with the title.
 */
import * as React from 'react'

export interface PageHeaderProps {
  title: React.ReactNode
  /** Optional subtitle / sub-copy under the title */
  description?: React.ReactNode
  /** Right-aligned actions slot (typically a Button) */
  actions?: React.ReactNode
  /** Override default size — for tight pages use 'sm'. */
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const TITLE_SIZE: Record<NonNullable<PageHeaderProps['size']>, string> = {
  sm: 'text-[24px] sm:text-[28px]',
  md: 'text-[28px] sm:text-[32px] md:text-[36px]',
  lg: 'text-[32px] sm:text-[40px] md:text-[48px]',
}

export function PageHeader({
  title,
  description,
  actions,
  size = 'md',
  className = '',
}: PageHeaderProps) {
  return (
    <header
      className={[
        'flex flex-col md:flex-row md:items-end md:justify-between gap-4',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="min-w-0">
        <h1
          className={[
            TITLE_SIZE[size],
            'font-display font-medium text-ink leading-[1.1] tracking-[-0.02em]',
          ].join(' ')}
        >
          {title}
        </h1>
        {description && (
          <p className="mt-2 text-[15px] text-ink-2 leading-[1.55] max-w-2xl">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="shrink-0 flex items-center gap-2">{actions}</div>}
    </header>
  )
}
