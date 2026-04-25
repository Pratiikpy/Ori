// StatsRibbon — 4-up stats below hero. Top + bottom 1px hairline, 32px V-padding.
// Ports Ori-landing.html lines 1158-1175. 4 cols on lg, 2 cols below 720px.

import { Reveal } from '@/components/ui'

interface StatItem {
  k: string
  unit?: string
  v: string
}

const STATS: readonly StatItem[] = [
  { k: '97', unit: 'ms', v: 'median settlement' },
  { k: '1', unit: '%', v: 'creator tip fee' },
  { k: '0', v: 'wallet popups' },
  { k: 'e2e', v: 'encryption by default' },
]

export function StatsRibbon() {
  return (
    <section className="shell">
      <Reveal
        as="section"
        className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10 py-8 border-y border-[var(--color-border)]"
      >
        {STATS.map((s) => (
          <StatCell key={s.v} {...s} />
        ))}
      </Reveal>
    </section>
  )
}

/**
 * StatCell — mono 28px number with optional ink-3 unit suffix, lowercase
 * caption underneath. `tabular-nums` keeps columns aligned across stats.
 * The "e2e" stat omits tabular-nums because it's not a number.
 */
function StatCell({ k, unit, v }: StatItem) {
  const isNumeric = unit !== undefined || /^\d/.test(k)
  return (
    <div>
      <div
        className={
          'font-mono text-foreground leading-none ' +
          (isNumeric ? 'tabular-nums' : '')
        }
        style={{ fontSize: '28px', fontWeight: 500, letterSpacing: '-0.03em' }}
      >
        {k}
        {unit && (
          <span className="text-ink-3 text-[20px] ml-0.5">{unit}</span>
        )}
      </div>
      <div
        className="mt-1 text-[12px] text-ink-3"
        style={{ letterSpacing: '0.01em' }}
      >
        {v}
      </div>
    </div>
  )
}
