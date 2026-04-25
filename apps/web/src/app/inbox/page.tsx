'use client'

/**
 * /inbox — Inbox surface, ported 1:1 from prototype Inbox.jsx.
 *
 * Layout (lg+): grid-cols-[320px_1fr_360px]
 *   • Threads (left)       — driven by /v1/profiles/:address/activity entries
 *   • Conversation (mid)   — placeholder for the selected thread (deeper
 *                            inline rendering is a follow-up; clicking a
 *                            thread can route to /chat/[address])
 *   • Agent panel (right)  — Authorized agents + Actions/MCP tools tabs
 *
 * "MCP control room" header replaces the prototype's "Nova Agent" persona,
 * since your real backend authorizes agents by address (Claude Desktop's
 * wallet, etc.), not a built-in mascot.
 */
import * as React from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { useInterwovenKit } from '@initia/interwovenkit-react'
import { AppShell } from '@/components/layout/app-shell'
import { ActionCard, type ActionDef } from '@/components/ui/action-card'
import { ActionDialog } from '@/components/ui/action-dialog'
import { getActivityFeed, getUserAgentActions } from '@/lib/api'
import { mcpTools } from '@/lib/ori-data'

type AgentTab = 'actions' | 'tools'

interface ThreadStub {
  identifier: string
  title: string
  preview: string
  unread: number
}

const quickActions: ActionDef[] = [
  { id: 'encrypted-dm',    title: 'Send encrypted DM',  contract: '/v1/messages',          fields: ['Thread', 'Encrypted payload'] },
  { id: 'mark-read',       title: 'Mark message read',  contract: '/v1/messages/:id/read', fields: ['Message ID'] },
  { id: 'thread-payment',  title: 'Pay from chat',      contract: 'ori.send_payment',      fields: ['Recipient', 'Amount', 'Memo'] },
  { id: 'thread-gift',     title: 'Create chat gift',   contract: 'ori.create_link_gift',  fields: ['Amount', 'Shortcode'] },
]

export default function InboxPage() {
  const { initiaAddress } = useInterwovenKit()
  const [agentTab, setAgentTab]       = React.useState<AgentTab>('actions')
  const [draft, setDraft]             = React.useState('')
  const [modalAction, setModalAction] = React.useState<ActionDef | null>(null)
  const [activeThreadId, setActiveThreadId] = React.useState<string | null>(null)

  const activity = useQuery({
    queryKey: ['activity', initiaAddress],
    queryFn: () => getActivityFeed(initiaAddress!),
    enabled: Boolean(initiaAddress),
    staleTime: 30_000,
  })
  const agentActionsQuery = useQuery({
    queryKey: ['user-agent-actions', initiaAddress],
    queryFn: () => getUserAgentActions(initiaAddress!),
    enabled: Boolean(initiaAddress),
    staleTime: 30_000,
  })

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

  const activeThread = threads.find((t) => t.identifier === activeThreadId) ?? threads[0]
  const recentAgentActions = (agentActionsQuery.data?.entries ?? []).slice(0, 4)

  return (
    <AppShell eyebrow="Inbox" title="Chat wallet control room">
      <section className="grid min-h-[calc(100vh-90px)] grid-cols-1 border-b border-black/10 lg:grid-cols-[320px_1fr_360px]">
        {/* Threads */}
        <aside className="border-b border-black/10 bg-[#F5F5F5] p-4 lg:border-b-0 lg:border-r">
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-[#52525B]">
            Threads
          </p>
          <div className="space-y-2">
            {activity.isLoading && Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 border border-black/10 bg-white animate-pulse" />
            ))}
            {!activity.isLoading && threads.length === 0 && (
              <p className="border border-black/10 bg-white p-4 text-sm text-[#52525B]">
                No conversations yet. Send a payment to start one.
              </p>
            )}
            {threads.map((thread) => {
              const active = activeThread?.identifier === thread.identifier
              return (
                <button
                  key={thread.identifier}
                  type="button"
                  onClick={() => setActiveThreadId(thread.identifier)}
                  className={[
                    'w-full border p-4 text-left transition-colors cursor-pointer',
                    active
                      ? 'border-[#0022FF] bg-white shadow-[4px_4px_0px_0px_rgba(0,34,255,1)]'
                      : 'border-black/10 bg-white hover:border-black',
                  ].join(' ')}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-display text-base font-bold truncate">
                      {thread.title}
                    </span>
                    {thread.unread > 0 && (
                      <span className="font-mono text-xs text-[#0022FF]">{thread.unread}</span>
                    )}
                  </div>
                  <p className="mt-1 font-mono text-xs text-[#52525B] truncate">{thread.identifier}</p>
                  <p className="mt-3 text-sm text-[#52525B] truncate">{thread.preview}</p>
                </button>
              )
            })}
          </div>
        </aside>

        {/* Conversation */}
        <div className="flex min-h-[620px] flex-col">
          <div className="border-b border-black/10 p-5">
            {activeThread ? (
              <>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#52525B]">DM</p>
                <h2 className="font-display text-2xl font-black tracking-tight sm:text-3xl">
                  {activeThread.title}
                </h2>
                <div className="mt-1 flex flex-wrap items-center gap-3 font-mono text-xs text-[#52525B]">
                  <span>{activeThread.identifier}</span>
                  <span className="flex items-center gap-1 text-[#00A858]">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-[#00C566]" />
                    online
                  </span>
                </div>
              </>
            ) : (
              <p className="font-mono text-sm text-[#52525B]">Pick a thread or start one.</p>
            )}
          </div>

          <div className="flex-1 flex items-center justify-center p-10 bg-white">
            {activeThread ? (
              <Link
                href={`/chat/${activeThread.identifier}`}
                className="border border-black px-6 py-3 text-sm font-semibold transition hover:bg-black hover:text-white cursor-pointer"
              >
                Open full thread →
              </Link>
            ) : (
              <p className="font-mono text-sm text-[#52525B]">No active thread.</p>
            )}
          </div>

          {/* Composer */}
          <div className="border-t border-black/10 p-4">
            <div className="mb-3 grid grid-cols-2 gap-2 xl:grid-cols-4">
              {quickActions.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => setModalAction(action)}
                  className="border border-black/20 px-3 py-3 text-xs font-semibold leading-tight transition hover:bg-black hover:text-white sm:text-sm cursor-pointer"
                >
                  {action.title}
                </button>
              ))}
            </div>
            <div className="flex items-stretch gap-2">
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Write encrypted message..."
                className="h-12 w-full min-w-0 border border-black/20 bg-white px-3 text-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-[#0022FF]"
              />
              <button
                type="button"
                onClick={() => {
                  if (draft.trim() && activeThread) {
                    // Quick stub: route to the full chat where the real send fires
                    window.location.href = `/chat/${activeThread.identifier}?d=${encodeURIComponent(draft)}`
                  }
                }}
                className="h-12 shrink-0 bg-[#0022FF] px-4 text-white transition hover:bg-[#0019CC] cursor-pointer"
                aria-label="Send encrypted message"
              >
                <SendGlyph />
              </button>
            </div>
          </div>
        </div>

        {/* Agent panel */}
        <aside className="border-t border-black/10 bg-[#F5F5F5] p-4 lg:border-l lg:border-t-0">
          <div className="mb-5 border border-black/10 bg-white p-4">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#52525B]">
              MCP control room
            </p>
            <h3 className="mt-2 font-display text-xl font-black tracking-tight">
              Authorized agents
            </h3>
            <p className="mt-2 text-sm leading-5 text-[#52525B]">
              Claude runs outside Ori. This panel only shows policy, allowed tools, and action logs.
            </p>
          </div>
          <div className="grid h-auto grid-cols-2 bg-white">
            <button
              type="button"
              onClick={() => setAgentTab('actions')}
              className={[
                'inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold transition cursor-pointer',
                agentTab === 'actions' ? 'bg-black text-white' : 'text-[#0A0A0A] hover:bg-[#F5F5F5]',
              ].join(' ')}
            >
              Actions
            </button>
            <button
              type="button"
              onClick={() => setAgentTab('tools')}
              className={[
                'inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold transition cursor-pointer',
                agentTab === 'tools' ? 'bg-black text-white' : 'text-[#0A0A0A] hover:bg-[#F5F5F5]',
              ].join(' ')}
            >
              MCP tools
            </button>
          </div>

          {agentTab === 'actions' && (
            <div className="mt-4 space-y-3">
              {agentActionsQuery.isLoading && Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-24 border border-black/10 bg-white animate-pulse" />
              ))}
              {!agentActionsQuery.isLoading && recentAgentActions.length === 0 && (
                <p className="border border-black/10 bg-white p-4 text-sm text-[#52525B]">
                  No agent activity yet. Authorize Claude in Settings to start.
                </p>
              )}
              {recentAgentActions.map((item) => (
                <div key={item.id} className="border border-black/10 bg-white p-4">
                  <p className="font-mono text-xs text-[#0022FF]">{item.toolName}</p>
                  <p className="mt-2 text-sm font-semibold capitalize">{item.status}</p>
                  <p className="mt-2 font-mono text-xs text-[#52525B] truncate">
                    {short(item.agentAddr)}
                  </p>
                </div>
              ))}
            </div>
          )}
          {agentTab === 'tools' && (
            <div className="mt-4 grid grid-cols-1 gap-3">
              {mcpTools.map((tool) => (
                <ActionCard
                  key={tool}
                  scope="mcp"
                  action={{
                    id: tool.replaceAll('.', '-'),
                    title: tool,
                    contract: 'MCP stdio tool',
                    fields: ['Input JSON', 'Spending cap'],
                  }}
                  onOpen={setModalAction}
                />
              ))}
            </div>
          )}
        </aside>
      </section>

      <ActionDialog action={modalAction} onClose={() => setModalAction(null)} />
    </AppShell>
  )
}

function short(addr: string | null | undefined): string {
  if (!addr) return ''
  if (addr.length <= 14) return addr
  return `${addr.slice(0, 8)}…${addr.slice(-4)}`
}

function SendGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m22 2-7 20-4-9-9-4Z" />
      <path d="M22 2 11 13" />
    </svg>
  )
}
