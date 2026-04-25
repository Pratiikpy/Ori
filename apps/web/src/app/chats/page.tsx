'use client'

import { useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useInterwovenKit } from '@initia/interwovenkit-react'
import { MessageSquarePlus, Zap } from 'lucide-react'

import { AppShell } from '@/components/app-shell'
import { PageHeader, Serif } from '@/components/page-header'
import { OnboardingBanner } from '@/components/onboarding-banner'
import { useSession } from '@/hooks/use-session'
import { useKeypair } from '@/hooks/use-keypair'
import { fetchChats, type ChatSummary } from '@/lib/api-chats'
import { getSocket } from '@/lib/ws'

function displayName(cp: ChatSummary['counterparty']): string {
  return cp.initName ?? `${cp.initiaAddress.slice(0, 10)}…${cp.initiaAddress.slice(-4)}`
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  return `${Math.floor(s / 86400)}d`
}

export default function ChatsPage() {
  const router = useRouter()
  const { isConnected, username } = useInterwovenKit()
  const { isAuthenticated, status } = useSession()
  const { keypair } = useKeypair()

  useEffect(() => {
    if (!isConnected) router.replace('/')
    else if (status === 'unauthenticated') router.replace('/onboard')
  }, [isConnected, status, router])

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['chats'],
    queryFn: fetchChats,
    enabled: isAuthenticated,
    staleTime: 5_000,
  })

  // Refresh chats when new messages arrive over WebSocket.
  useEffect(() => {
    if (!isAuthenticated) return
    const socket = getSocket()
    const onNew = () => {
      void refetch()
    }
    socket.on('message.new', onNew)
    return () => {
      socket.off('message.new', onNew)
    }
  }, [isAuthenticated, refetch])

  const chats = useMemo(() => data?.chats ?? [], [data])

  return (
    <AppShell title="Chats">
      <div className="flex-1 flex flex-col w-full max-w-2xl">
        <div className="pb-4 flex items-start justify-between gap-3">
          <PageHeader
            kicker="05 · Friends"
            title={
              <>
                Your <Serif>people</Serif>.
              </>
            }
            className="mb-0 flex-1"
          />
          <Link
            href="/chats/new"
            className="shrink-0 inline-flex items-center gap-1.5 rounded-full px-3.5 h-9 bg-[var(--color-primary)] hover:bg-[var(--color-primary-bright)] text-white text-[12.5px] font-medium transition"
          >
            <MessageSquarePlus className="w-3.5 h-3.5" />
            New
          </Link>
        </div>

        <OnboardingBanner
          hasClaimed={Boolean(username)}
          hasKeypair={Boolean(keypair)}
          hasSentPayment={chats.some((c) => c.lastMessageAt !== null)}
        />

        {isLoading ? (
          <div className="px-5 py-12 text-center text-ink-3 text-[13px]">
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-4">
              Loading conversations…
            </span>
          </div>
        ) : chats.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="divide-y divide-[var(--color-line-hairline)]">
            {chats.map((c) => {
              const href = `/chat/${c.counterparty.initName ?? c.counterparty.initiaAddress}`
              // Last activity within 2 minutes → "live right now" signal.
              // Tuned short on purpose: iMessage-style presence feels flaky if
              // the window is wider than a conversation's natural pause.
              const lastMs = new Date(c.lastMessageAt).getTime()
              const isFresh = Number.isFinite(lastMs) && Date.now() - lastMs < 120_000
              return (
                <li key={c.chatId}>
                  <Link
                    href={href}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] transition"
                  >
                    <Avatar seed={c.counterparty.initiaAddress} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[13.5px] font-medium tracking-[-0.005em] truncate inline-flex items-center gap-1.5">
                          {displayName(c.counterparty)}
                          {isFresh && (
                            <Zap
                              className="w-3 h-3 text-[var(--color-primary-bright)] shrink-0"
                              aria-label="Active in the last 2 minutes"
                            />
                          )}
                        </span>
                        <span className="text-[10.5px] font-mono text-ink-4 flex-none tnum">
                          {timeAgo(c.lastMessageAt)}
                        </span>
                      </div>
                      <div className="mt-0.5 text-[11.5px] text-ink-3 truncate">
                        {c.counterparty.initName ? (
                          <span className="font-mono">
                            {c.counterparty.initiaAddress.slice(0, 12)}…
                          </span>
                        ) : (
                          'Tap to open conversation'
                        )}
                      </div>
                    </div>
                    {c.unreadCount > 0 && (
                      <span
                        className="tnum ml-2 min-w-[18px] h-[18px] rounded-full text-[10.5px] font-semibold inline-flex items-center justify-center px-1.5"
                        style={{
                          backgroundColor: 'var(--color-primary)',
                          color: 'var(--color-primary-foreground)',
                        }}
                      >
                        {c.unreadCount}
                      </span>
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </AppShell>
  )
}

/**
 * Empty state — editorial voice. Reference principle: an empty state is
 * STILL content. Treat it with the same rhythm as the page header (mono
 * kicker + italic serif accent), not a generic "nothing here yet" shrug.
 */
function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
        style={{
          background: 'rgba(255,255,255, 0.04)',
          border: '1px solid var(--color-border-strong)',
        }}
      >
        <MessageSquarePlus className="w-6 h-6 text-[var(--color-primary-bright)]" />
      </div>
      <div className="text-[11px] font-mono uppercase tracking-[0.14em] text-ink-3">
        Your threads
      </div>
      <h2 className="mt-2 text-[22px] font-medium tracking-[-0.02em] leading-[1.2] text-foreground">
        Your <Serif>people</Serif> live here.
      </h2>
      <p className="mt-2.5 max-w-xs text-[13px] text-ink-3 leading-[1.55]">
        Start a chat with someone&rsquo;s <span className="font-mono text-ink-2">.init</span>{' '}
        name, or share a payment link to bring a friend on.
      </p>
      <Link
        href="/chats/new"
        className="mt-6 rounded-full h-10 px-5 text-[13px] font-medium inline-flex items-center gap-1.5 hover:-translate-y-[1px] transition will-change-transform"
        style={{
          backgroundColor: 'var(--color-foreground)',
          color: 'var(--color-background)',
        }}
      >
        Start a chat
      </Link>
    </div>
  )
}

function Avatar({ seed }: { seed: string }) {
  // Deterministic gradient avatar — no external image required.
  const hash = Array.from(seed).reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 0)
  const hue1 = hash % 360
  const hue2 = (hue1 + 60) % 360
  return (
    <div
      className="w-10 h-10 rounded-full flex-none"
      style={{
        background: `linear-gradient(135deg, hsl(${hue1} 60% 50%), hsl(${hue2} 60% 40%))`,
      }}
      aria-hidden
    />
  )
}
