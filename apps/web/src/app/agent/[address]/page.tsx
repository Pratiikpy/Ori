'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  Bot,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  Hash,
  ArrowLeft,
} from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import { Skeleton } from '@/components/skeleton'
import { getAgentActions, type AgentActionEntry, type AgentActionsPage } from '@/lib/api'

function shortAddr(a: string): string {
  if (a.length <= 16) return a
  return `${a.slice(0, 10)}…${a.slice(-6)}`
}

function toolBadgeColor(tool: string): string {
  if (tool.includes('predict')) return 'bg-warning/15 text-warning'
  if (tool.includes('tip')) return 'bg-danger/15 text-danger'
  if (tool.includes('paywall')) return 'bg-primary/15 text-primary'
  if (tool.includes('payment')) return 'bg-success/15 text-success'
  if (tool.includes('search') || tool.includes('fetch')) return 'bg-muted text-muted-foreground'
  return 'bg-accent/15 text-accent'
}

function StatusIcon({ status }: { status: AgentActionEntry['status'] }) {
  if (status === 'success')
    return <CheckCircle2 className="w-3.5 h-3.5 text-success" />
  if (status === 'failed') return <XCircle className="w-3.5 h-3.5 text-danger" />
  return <Clock className="w-3.5 h-3.5 text-muted-foreground" />
}

export default function AgentDetailPage() {
  const params = useParams<{ address: string }>()
  const signerAddr = decodeURIComponent(params.address)

  const [page, setPage] = useState<AgentActionsPage | null>(null)
  const [entries, setEntries] = useState<AgentActionEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getAgentActions(signerAddr, { limit: 50 })
      .then((p) => {
        if (!cancelled) {
          setPage(p)
          setEntries(p.entries)
          setError(null)
        }
      })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : 'load failed'))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [signerAddr])

  const loadMore = async () => {
    if (!page?.nextCursor || loadingMore) return
    setLoadingMore(true)
    try {
      const next = await getAgentActions(signerAddr, {
        cursor: page.nextCursor,
        limit: 50,
      })
      setEntries((prev) => [...prev, ...next.entries])
      setPage(next)
    } finally {
      setLoadingMore(false)
    }
  }

  const counts = entries.reduce(
    (acc, e) => {
      acc[e.status] += 1
      return acc
    },
    { success: 0, failed: 0, pending: 0 } as Record<AgentActionEntry['status'], number>,
  )

  return (
    <AppShell title="Agent">
      <div className="px-5 py-6 max-w-2xl mx-auto w-full space-y-5">
        <Link
          href="/today"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition"
        >
          <ArrowLeft className="w-3 h-3" /> Today
        </Link>

        {/* Header */}
        <section className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
            <Bot className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">
              Agent signer
            </div>
            <div className="text-base font-mono font-semibold truncate">{signerAddr}</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Every on-chain action this signing key has taken, with source prompt hash
              and tx receipt. Immutable audit log.
            </div>
          </div>
        </section>

        {/* Stats */}
        {!loading && !error && (
          <section className="grid grid-cols-3 gap-2">
            <StatBox label="Success" value={counts.success} color="text-success" />
            <StatBox label="Failed" value={counts.failed} color="text-danger" />
            <StatBox label="Pending" value={counts.pending} color="text-muted-foreground" />
          </section>
        )}

        {/* List */}
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-xl border border-danger/40 bg-danger/10 text-danger p-4 text-sm">
            {error}
          </div>
        ) : entries.length === 0 ? (
          <div className="rounded-2xl border border-border bg-muted/20 p-8 text-center">
            <Bot className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <div className="text-sm font-semibold mb-1">No agent activity yet</div>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-sm mx-auto">
              Plug Claude Desktop into Ori MCP and the first action will appear here with
              its prompt hash and tx receipt.
            </p>
          </div>
        ) : (
          <section className="space-y-2">
            {entries.map((e) => (
              <ActionRow key={e.id} entry={e} />
            ))}
            {page?.nextCursor && (
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="w-full rounded-xl h-10 bg-muted hover:bg-border text-sm font-medium transition disabled:opacity-50"
              >
                {loadingMore ? 'Loading…' : 'Load more'}
              </button>
            )}
          </section>
        )}
      </div>
    </AppShell>
  )
}

function StatBox({
  label,
  value,
  color,
}: {
  label: string
  value: number
  color: string
}) {
  return (
    <div className="rounded-xl border border-border bg-muted/20 p-3 text-center">
      <div className={`text-2xl font-semibold tabular-nums ${color}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
    </div>
  )
}

function ActionRow({ entry }: { entry: AgentActionEntry }) {
  const when = new Date(entry.createdAt)
  const relative = relativeTime(when)

  return (
    <article className="rounded-xl border border-border bg-muted/10 p-3 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <StatusIcon status={entry.status} />
        <span
          className={`inline-flex items-center rounded-full px-2 h-6 text-[11px] font-semibold ${toolBadgeColor(entry.toolName)}`}
        >
          {entry.toolName}
        </span>
        <span className="text-xs text-muted-foreground ml-auto">{relative}</span>
      </div>

      {/* Redacted args preview */}
      <pre className="text-[11px] font-mono leading-snug bg-background rounded-lg p-2 overflow-x-auto whitespace-pre-wrap break-words">
        {JSON.stringify(entry.args, null, 2).slice(0, 480)}
      </pre>

      <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground">
        {entry.promptHash && (
          <span className="inline-flex items-center gap-1 font-mono">
            <Hash className="w-3 h-3" />
            {entry.promptHash.slice(0, 12)}…
          </span>
        )}
        {entry.txHash && (
          <a
            href={`https://scan.testnet.initia.xyz/ori-1/txs/${entry.txHash}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-mono text-primary hover:underline"
          >
            <ExternalLink className="w-3 h-3" />
            {entry.txHash.slice(0, 10)}…
          </a>
        )}
        {entry.errorMsg && (
          <span className="text-danger truncate max-w-full">err: {entry.errorMsg.slice(0, 120)}</span>
        )}
      </div>
    </article>
  )
}

function relativeTime(d: Date): string {
  const diff = Date.now() - d.getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const days = Math.floor(h / 24)
  return `${days}d ago`
}
