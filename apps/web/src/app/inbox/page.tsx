'use client'

/**
 * /inbox — Inbox surface (Emergent design parity).
 *
 * Three columns on desktop:
 *   THREADS                 │  CONVERSATION       │  AGENT PANEL
 *   open chat threads       │  active thread body │  agent profile + actions
 *
 * Threads come from /v1/chats (existing endpoint). Active conversation
 * uses the existing /chat/[identifier] page when clicked.
 */
import * as React from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { useInterwovenKit } from '@initia/interwovenkit-react'
import { AppShell } from '@/components/layout/app-shell'
import { Icon } from '@/components/ui/icon'
import { getActivityFeed, getUserAgentActions } from '@/lib/api'

interface ThreadStub {
  identifier: string
  title: string
  preview: string
  unread: number
  isAgent?: boolean
}

export default function InboxPage() {
  const { initiaAddress } = useInterwovenKit()

  // Pull recent activity to derive thread stubs (real endpoint).
  const activity = useQuery({
    queryKey: ['activity', initiaAddress],
    queryFn: () => getActivityFeed(initiaAddress!),
    enabled: Boolean(initiaAddress),
    staleTime: 30_000,
  })

  const agentActions = useQuery({
    queryKey: ['user-agent-actions', initiaAddress],
    queryFn: () => getUserAgentActions(initiaAddress!),
    enabled: Boolean(initiaAddress),
    staleTime: 30_000,
  })

  // Build thread list from activity entries. ActivityEntry has a `kind` and
  // a counterparty (e.g. `from` / `to`). We accept any string field that
  // looks like an address to seed thread stubs.
  const threads = React.useMemo<ThreadStub[]>(() => {
    const seen = new Set<string>()
    const out: ThreadStub[] = []
    for (const ev of activity.data?.entries ?? []) {
      const e = ev as Record<string, unknown>
      const counter =
        (typeof e.counterAddress === 'string' && e.counterAddress) ||
        (typeof e.from === 'string' && e.from) ||
        (typeof e.to === 'string' && e.to) ||
        null
      if (counter && !seen.has(counter)) {
        seen.add(counter)
        out.push({
          identifier: counter,
          title: short(counter),
          preview: typeof e.kind === 'string' ? e.kind : 'event',
          unread: 0,
        })
      }
      if (out.length >= 8) break
    }
    return out
  }, [activity.data])

  const recentAgentAction = agentActions.data?.entries?.[0]

  return (
    <AppShell eyebrow="Inbox" title="Chat wallet control room">
      <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)_320px] gap-3 min-h-[600px]">
        {/* Threads */}
        <aside className="border border-[var(--color-line)] rounded-md bg-white">
          <div className="px-4 h-12 flex items-center border-b border-[var(--color-line)]">
            <span className="eyebrow">Threads</span>
          </div>
          <ul className="flex flex-col">
            {activity.isLoading && Array.from({ length: 4 }).map((_, i) => (
              <li key={i} className="h-20 border-b border-[var(--color-line)] p-4">
                <div className="h-4 w-32 bg-[var(--color-bg-muted)] rounded animate-pulse" />
                <div className="mt-2 h-3 w-48 bg-[var(--color-bg-muted)] rounded animate-pulse" />
              </li>
            ))}
            {!activity.isLoading && threads.length === 0 && (
              <li className="p-5 text-[13px] text-ink-3">
                No conversations yet. Send a payment to start one.
              </li>
            )}
            {threads.map((t, i) => (
              <li key={t.identifier} className={i !== threads.length - 1 ? 'border-b border-[var(--color-line)]' : ''}>
                <Link
                  href={`/chat/${t.identifier}`}
                  className="block px-4 py-3.5 hover:bg-[var(--color-surface-hover)] transition cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-display font-bold text-[14px] text-ink truncate">
                      {t.title}
                    </span>
                    {t.unread > 0 && (
                      <span className="ml-2 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full bg-[var(--color-accent)] text-white text-[10.5px] font-mono">
                        {t.unread}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 font-mono text-[11px] text-ink-3">
                    {short(t.identifier)}
                  </div>
                  <div className="mt-1 text-[12px] text-ink-3 truncate">
                    {t.preview}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </aside>

        {/* Conversation placeholder */}
        <main className="border border-[var(--color-line)] rounded-md bg-white flex flex-col">
          <div className="px-5 h-12 flex items-center border-b border-[var(--color-line)]">
            <span className="eyebrow">Active conversation</span>
          </div>
          <div className="flex-1 flex items-center justify-center p-10">
            <div className="text-center">
              <Icon name="chats" size={28} className="text-ink-3 mx-auto" />
              <p className="mt-4 text-[14px] text-ink-2">
                Pick a thread on the left or start one with{' '}
                <Link href="/send" className="text-[var(--color-accent)] underline">
                  Send payment
                </Link>.
              </p>
            </div>
          </div>
          <div className="border-t border-[var(--color-line)] px-5 h-14 flex items-center gap-2 text-[12.5px] text-ink-3 overflow-x-auto">
            <span className="px-3 h-7 inline-flex items-center rounded-full border border-[var(--color-line)]">Send encrypted DM</span>
            <span className="px-3 h-7 inline-flex items-center rounded-full border border-[var(--color-line)]">Mark message read</span>
            <span className="px-3 h-7 inline-flex items-center rounded-full border border-[var(--color-line)]">Pay from chat</span>
            <span className="px-3 h-7 inline-flex items-center rounded-full border border-[var(--color-line)]">Create chat gift</span>
          </div>
        </main>

        {/* Agent panel */}
        <aside className="border border-[var(--color-line)] rounded-md bg-white">
          <div className="px-4 h-12 flex items-center border-b border-[var(--color-line)]">
            <span className="eyebrow">Agent</span>
          </div>
          <div className="p-5">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-md bg-[var(--color-accent-soft)] inline-flex items-center justify-center">
                <Icon name="sparkle" size={18} className="text-[var(--color-accent)]" />
              </span>
              <div>
                <div className="font-display font-bold text-[15px] text-ink">Agents</div>
                <div className="text-[11.5px] text-ink-3 font-mono">A2A + MCP</div>
              </div>
            </div>
            <p className="mt-4 text-[13px] text-ink-3 leading-[1.55]">
              Tools your AI agents can call on your behalf — under the on-chain caps you set.
            </p>
            <Link
              href="/ask"
              className="mt-4 inline-flex items-center justify-center w-full h-9 rounded-md bg-[var(--color-ink)] text-white text-[12.5px] font-medium hover:opacity-85 transition cursor-pointer"
            >
              View MCP tools
            </Link>
          </div>
          <div className="px-5 pb-5">
            <span className="eyebrow">Recent agent action</span>
            {recentAgentAction ? (
              <div className="mt-3 border border-[var(--color-line)] rounded-md p-3">
                <div className="font-mono text-[11px] text-[var(--color-accent)]">
                  {recentAgentAction.toolName}
                </div>
                <div className="mt-1 text-[13px] font-medium text-ink capitalize">
                  {recentAgentAction.status} · {short(recentAgentAction.agentAddr)}
                </div>
              </div>
            ) : (
              <div className="mt-3 text-[12.5px] text-ink-3">No agent activity yet.</div>
            )}
          </div>
        </aside>
      </div>
    </AppShell>
  )
}

function short(addr: string | null | undefined): string {
  if (!addr) return '—'
  return `${addr.slice(0, 8)}…${addr.slice(-4)}`
}
