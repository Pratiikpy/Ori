'use client'

/**
 * FlowCard — the repeating tile on Money/Play/Profile surfaces.
 *
 *   ┌─────────────────────────────┐
 *   │ MODULE_NAME.MOVE            │   ← mono eyebrow
 *   │                             │
 *   │ Send payment                │   ← title (bold display)
 *   │ Recipient .init or address  │   ← description (small ink-3)
 *   │ — Amount — Memo             │
 *   │                             │
 *   │ ┌─────────────────────────┐ │
 *   │ │       Open flow         │ │   ← black solid pill
 *   │ └─────────────────────────┘ │
 *   └─────────────────────────────┘
 *
 * Mirrors the Emergent prototype 1:1. `href` is required so every card
 * routes to the existing per-feature page where the contract call
 * actually fires.
 */
import * as React from 'react'
import Link from 'next/link'

export interface FlowCardProps {
  /** mono eyebrow — usually the Move module name, e.g. "payment_router.move" */
  module: string
  /** Card title — short verb phrase like "Send payment" */
  title: string
  /** One-liner under the title, lower-emphasis */
  description?: string
  /** Where "Open flow" routes to */
  href: string
  /** Override the CTA label */
  ctaLabel?: string
  /** Optional disabled state */
  disabled?: boolean
}

export function FlowCard({
  module,
  title,
  description,
  href,
  ctaLabel = 'Open flow',
  disabled,
}: FlowCardProps) {
  return (
    <div className="border border-[var(--color-line)] rounded-md bg-white p-5 flex flex-col gap-4 transition hover:border-[var(--color-line-strong)]">
      <div className="flex flex-col gap-2">
        <span className="font-mono text-[10.5px] tracking-[0.10em] text-[var(--color-accent)] uppercase">
          {module}
        </span>
        <h3 className="font-display font-bold text-[18px] leading-tight text-ink">
          {title}
        </h3>
        {description && (
          <p className="text-[13px] text-ink-3 leading-[1.5]">
            {description}
          </p>
        )}
      </div>
      {disabled ? (
        <span className="inline-flex items-center justify-center h-10 rounded-md bg-[var(--color-surface-pressed)] text-[13px] font-medium text-ink-3 cursor-not-allowed">
          {ctaLabel}
        </span>
      ) : (
        <Link
          href={href}
          className="inline-flex items-center justify-center h-10 rounded-md bg-[var(--color-ink)] text-white text-[13px] font-medium hover:opacity-85 active:scale-[0.98] transition cursor-pointer"
        >
          {ctaLabel}
        </Link>
      )}
    </div>
  )
}
