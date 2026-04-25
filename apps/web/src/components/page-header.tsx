/**
 * <PageHeader> — shared kicker / serif-accent title / sub block.
 *
 * This is the rhythm the landing uses (kicker in mono uppercase, title in
 * large display with optional Instrument Serif italic accent on one word,
 * optional sub beneath). Using it on every inner page is what makes the
 * app feel like one product instead of a pile of screens.
 *
 * Server component. No hooks, no client JS. Drop it at the top of any
 * page body, directly inside the AppShell's <main>.
 *
 * Usage:
 *   <PageHeader kicker="01 · Today" title={<>Hey, <Serif>ayo</Serif>.</>} />
 *   <PageHeader kicker="02 · Predict" title="BTC, ETH, SOL" sub="60s markets..." />
 *
 * The <Serif> tag is just `<span className="font-serif">…</span>`. Re-exported
 * from here so pages don't have to remember the class name.
 */
import type { ReactNode } from 'react'

export function PageHeader({
  kicker,
  title,
  sub,
  className = '',
}: {
  kicker?: string
  title: ReactNode
  sub?: ReactNode
  className?: string
}) {
  return (
    <header className={'mb-8 md:mb-10 ' + className}>
      {kicker && (
        <div className="text-[11px] uppercase tracking-[0.16em] text-ink-3 font-mono">
          {kicker}
        </div>
      )}
      <h1
        className={
          'tracked-tighter font-medium leading-[1.05] ' +
          (kicker ? 'mt-3' : '') +
          ' text-[28px] md:text-[36px]'
        }
      >
        {title}
      </h1>
      {sub && (
        <p className="mt-3 text-[14.5px] leading-[1.55] text-ink-2 max-w-xl">{sub}</p>
      )}
    </header>
  )
}

/** Shorthand for the Instrument Serif italic accent. */
export function Serif({ children }: { children: ReactNode }) {
  return <span className="font-serif">{children}</span>
}
