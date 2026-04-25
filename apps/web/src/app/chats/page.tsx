'use client'

/**
 * /chats — list of conversations, ordered by most-recent activity.
 *
 * Wallet-gated. While the data loads we render skeleton rows. On empty,
 * we show a single big tile inviting a new conversation. Each row links
 * to /chat/[name-or-address] which renders the thread view.
 */
import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useInterwovenKit } from '@initia/interwovenkit-react'
import { AppShell } from '@/components/layout/app-shell'
import {
  Avatar,
  Button,
  EmptyState,
  GlassCard,
  Icon,
  PageHeader,
} from '@/components/ui'
import { fetchChats, type ChatSummary } from '@/lib/api-chats'
import { useSession } from '@/hooks/use-session'

export default function ChatsPage() {
  const router = useRouter()
  const { isConnected } = useInterwovenKit()
  const { isAuthenticated, status } = useSession()

  React.useEffect(() => {
    if (!isConnected) router.replace('/')
    else if (status === 'unauthenticated') router.replace('/onboard')
  }, [isConnected, status, router])

  const { data, isLoading } = useQuery({
    queryKey: ['chats'],
    queryFn: fetchChats,
    enabled: isAuthenticated,
    staleTime: 5_000,
  })

  const chats = data?.chats ?? []

  return (
    <AppShell>
      <PageHeader
        title="Chats"
        description="Conversations where messages and money share one surface."
        actions={
          <Button
            variant="primary"
            size="md"
            leadingIcon="plus"
            onClick={() => router.push('/send')}
          >
            New
          </Button>
        }
      />

      <div className="mt-10">
        {isLoading ? (
          <SkeletonList />
        ) : chats.length === 0 ? (
          <EmptyState
            icon="chats"
            title="No conversations yet"
            description="Send a payment to a .init name and a thread will appear here. Or share a payment link to bring a friend onto Ori."
            action={
              <Button
                variant="primary"
                size="md"
                trailingIcon="arrow-right"
                onClick={() => router.push('/send')}
              >
                Send first payment
              </Button>
            }
          />
        ) : (
          <GlassCard padding="none">
            <ul className="divide-y divide-black/5">
              {chats.map((c) => (
                <ChatRow key={c.chatId} chat={c} />
              ))}
            </ul>
          </GlassCard>
        )}
      </div>
    </AppShell>
  )
}

function ChatRow({ chat }: { chat: ChatSummary }) {
  const cp = chat.counterparty
  const display = cp.initName ?? `${cp.initiaAddress.slice(0, 8)}…${cp.initiaAddress.slice(-4)}`
  const href = `/chat/${encodeURIComponent(cp.initName ?? cp.initiaAddress)}`
  const lastMs = new Date(chat.lastMessageAt).getTime()
  const fresh = Number.isFinite(lastMs) && Date.now() - lastMs < 120_000

  return (
    <li>
      <Link
        href={href}
        className="flex items-center gap-4 p-5 hover:bg-black/[0.02] transition"
      >
        <Avatar
          seed={cp.initiaAddress}
          initial={display[0]}
          size="md"
          active={fresh}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[15px] font-medium text-ink truncate">
              {display}
            </span>
            <span className="text-[11px] text-ink-3 font-mono tnum shrink-0">
              {timeAgo(chat.lastMessageAt)}
            </span>
          </div>
          <div className="text-[13px] text-ink-3 truncate mt-0.5">
            {cp.initName ? (
              <span className="font-mono">
                {cp.initiaAddress.slice(0, 14)}…
              </span>
            ) : (
              'Tap to open conversation'
            )}
          </div>
        </div>
        {chat.unreadCount > 0 && (
          <span
            className="tnum text-[11px] font-semibold rounded-full inline-flex items-center justify-center px-2 h-[20px] shrink-0"
            style={{ background: '#1D1D1F', color: '#fff' }}
          >
            {chat.unreadCount}
          </span>
        )}
        <Icon name="arrow-right" size={14} className="text-ink-4 shrink-0" />
      </Link>
    </li>
  )
}

function SkeletonList() {
  return (
    <GlassCard padding="none">
      <ul className="divide-y divide-black/5">
        {[0, 1, 2, 3].map((i) => (
          <li key={i} className="flex items-center gap-4 p-5">
            <div className="w-10 h-10 rounded-full bg-black/5 animate-pulse" />
            <div className="flex-1">
              <div className="h-4 rounded-md bg-black/5 animate-pulse w-1/3" />
              <div className="mt-2 h-3 rounded-md bg-black/5 animate-pulse w-1/2" />
            </div>
          </li>
        ))}
      </ul>
    </GlassCard>
  )
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  return `${Math.floor(s / 86400)}d`
}
