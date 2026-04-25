'use client'

/**
 * TrustScore — compact grade chip + expandable breakdown.
 *
 * Pulls from `/v1/profiles/:address/trust-score`. Reuses the InitCred-style
 * 1000-point model; the breakdown is shown so users understand *why* their
 * score is what it is (transparent reputation).
 */
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, Shield } from 'lucide-react'
import { getTrustScore, type TrustScore as TrustScoreT } from '@/lib/api'

const GRADE_COLOR: Record<string, string> = {
  AAA: 'bg-success/15 border-success/40 text-success',
  AA: 'bg-success/10 border-success/30 text-success',
  A: 'bg-primary/15 border-primary/40 text-primary',
  B: 'bg-warning/10 border-warning/30 text-warning',
  C: 'bg-muted border-border text-muted-foreground',
  D: 'bg-danger/10 border-danger/30 text-danger',
}

type Props = {
  address: string
}

export function TrustScore({ address }: Props) {
  const [open, setOpen] = useState(false)
  const { data, isLoading } = useQuery<TrustScoreT>({
    queryKey: ['trust-score', address],
    queryFn: () => getTrustScore(address),
    enabled: Boolean(address),
    staleTime: 60_000,
  })

  if (isLoading || !data) {
    return (
      <div className="rounded-2xl border border-border bg-muted/30 p-4 text-xs text-muted-foreground">
        <Shield className="inline w-3.5 h-3.5 mr-1.5 align-[-2px]" />
        Reading reputation…
      </div>
    )
  }

  const gradeAccent = GRADE_COLOR[data.grade] ?? GRADE_COLOR.C
  const pct = Math.min(100, Math.max(0, (data.score / data.maxScore) * 100))

  return (
    <section className="rounded-2xl border border-border bg-muted/30 p-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 text-left"
        aria-expanded={open}
      >
        <div className="flex items-center gap-3">
          <div
            className={
              'w-12 h-12 rounded-xl border inline-flex items-center justify-center font-bold text-sm ' +
              gradeAccent
            }
          >
            {data.grade}
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Trust score</div>
            <div className="text-lg font-bold">
              {data.score}
              <span className="text-sm font-normal text-muted-foreground"> / {data.maxScore}</span>
            </div>
          </div>
        </div>
        <ChevronDown className={'w-4 h-4 text-muted-foreground transition ' + (open ? 'rotate-180' : '')} />
      </button>

      <div className="mt-3 h-1.5 w-full rounded-full bg-background overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-primary to-success"
          style={{ width: `${pct}%` }}
        />
      </div>

      {open && (
        <ul className="mt-4 space-y-2 text-xs">
          {Object.entries(data.breakdown).map(([key, row]) => {
            const frac = row.weight > 0 ? (row.points / row.weight) * 100 : 0
            return (
              <li key={key}>
                <div className="flex items-center justify-between">
                  <span className="font-medium">{labelFor(key)}</span>
                  <span className="font-mono">
                    {row.points} <span className="text-muted-foreground">/ {row.weight}</span>
                  </span>
                </div>
                <div className="mt-1 h-1 w-full rounded-full bg-background overflow-hidden">
                  <div className="h-full bg-primary/70" style={{ width: `${Math.min(100, frac)}%` }} />
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {data.explain[key] ?? ''}
                </p>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

function labelFor(key: string): string {
  switch (key) {
    case 'accountAge': return 'Account age'
    case 'paymentsSent': return 'Payments sent'
    case 'tipsGiven': return 'Tips given'
    case 'tipsReceived': return 'Tips received'
    case 'followersCount': return 'Followers'
    case 'badges': return 'Badges earned'
    default: return key
  }
}
