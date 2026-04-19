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
      <div className="flex-1 flex flex-col">
        <div className="px-5 pt-8 pb-4 flex items-start justify-between gap-3">
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
          <div className="px-4 py-10 text-center text-muted-foreground">Loading…</div>
        ) : chats.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="divide-y divide-border">
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
                    className="flex items-center gap-3 px-4 py-3 hover:bg-muted transition"
                  >
                    <Avatar seed={c.counterparty.initiaAddress} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium truncate inline-flex items-center gap-1">
                          {displayName(c.counterparty)}
                          {isFresh && (
                            <Zap
                              className="w-3.5 h-3.5 text-warning shrink-0"
                              aria-label="Active in the last 2 minutes"
                            />
                          )}
                        </span>
                        <span className="text-xs text-muted-foreground flex-none">
                          {timeAgo(c.lastMessageAt)}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
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
                      <span className="ml-2 min-w-5 h-5 rounded-full bg-primary text-primary-foreground text-[11px] font-bold flex items-center justify-center px-1.5">
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

function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 text-center text-muted-foreground">
      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
        <MessageSquarePlus className="w-7 h-7 text-primary" />
      </div>
      <h2 className="text-lg font-semibold text-foreground">No conversations yet</h2>
      <p className="mt-1 max-w-xs text-sm">
        Start a chat with someone&rsquo;s <span className="font-mono">.init</span> name, or send a
        payment link to bring a friend on.
      </p>
      <Link
        href="/chats/new"
        className="mt-5 rounded-full px-4 h-9 inline-flex items-center bg-primary text-primary-foreground text-sm font-medium"
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
