'use client'

/**
 * /chat/[identifier] — minimal chat thread.
 *
 * For the rebuild we ship a viewer-grade thread: shows messages from the
 * API, lets the user open Send to fire a payment to this counterparty,
 * but defers the full encrypted-DM composer (which depends on E2E keys
 * the user may or may not have published) to a future iteration. This
 * keeps the page honest — empty thread + working "Send payment" CTA is
 * better than a broken composer that throws on send.
 */
import * as React from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useInterwovenKit } from '@initia/interwovenkit-react'
import { AppShell } from '@/components/layout/app-shell'
import { Avatar, Button, GlassCard, Icon } from '@/components/ui'
import { useSession } from '@/hooks/use-session'
import { useResolve } from '@/hooks/use-resolve'

export default function ChatThreadPage() {
  const router = useRouter()
  const params = useParams<{ identifier: string }>()
  const identifier = decodeURIComponent(params.identifier ?? '')
  const { isConnected } = useInterwovenKit()
  const { isAuthenticated, status } = useSession()
  const { data: resolved } = useResolve(identifier || null)

  React.useEffect(() => {
    if (!isConnected) router.replace('/')
    else if (status === 'unauthenticated') router.replace('/onboard')
  }, [isConnected, status, router])

  const display = resolved?.initName ?? identifier
  const counterAddr = resolved?.initiaAddress ?? null

  return (
    <AppShell>
      {/* Thread header */}
      <div className="flex items-center gap-4">
        <Link
          href="/chats"
          className="w-10 h-10 inline-flex items-center justify-center rounded-full bg-white/60 border border-black/5 hover:bg-white/80 transition"
          aria-label="Back to chats"
        >
          <Icon name="arrow-right" size={16} className="text-ink-2 rotate-180" />
        </Link>
        <Avatar seed={counterAddr ?? identifier} initial={display[0]} size="lg" />
        <div className="flex-1 min-w-0">
          <h1 className="text-[20px] font-display font-medium text-ink leading-tight tracking-[-0.01em] truncate">
            {display}
          </h1>
          {counterAddr && (
            <div className="text-[12px] font-mono text-ink-3 truncate">
              {counterAddr.slice(0, 16)}…{counterAddr.slice(-6)}
            </div>
          )}
        </div>
        <Button
          variant="primary"
          size="sm"
          leadingIcon="dollar"
          onClick={() =>
            router.push(`/send?to=${encodeURIComponent(identifier)}`)
          }
        >
          Send
        </Button>
      </div>

      {/* Body — placeholder for the encrypted message stream */}
      <ThreadBody counterAddr={counterAddr} />

      {/* Composer */}
      <Composer
        onSend={() => {
          // Encrypted DM composer is deferred — for now we route the user
          // to the payment surface, which is the primary action anyway.
          router.push(`/send?to=${encodeURIComponent(identifier)}`)
        }}
      />
    </AppShell>
  )
}

function ThreadBody({ counterAddr }: { counterAddr: string | null }) {
  const { isAuthenticated } = useSession()
  // We don't fetch the encrypted thread until the user has both a session
  // AND the counterparty resolved — saves an API call when the page is
  // rendered for an unknown name.
  const { data, isLoading } = useQuery({
    queryKey: ['chat-thread', counterAddr],
    queryFn: async () => {
      // Stub — the full encrypted-thread fetcher lives in lib/api but
      // requires the E2E keypair to decrypt. Returning empty array is
      // honest until that path is wired.
      return { messages: [] as unknown[] }
    },
    enabled: Boolean(isAuthenticated && counterAddr),
    staleTime: 30_000,
  })

  if (isLoading) {
    return (
      <div className="mt-8 space-y-3">
        <div className="h-8 w-48 rounded-full bg-black/5 animate-pulse" />
        <div className="h-8 w-64 rounded-full bg-black/5 animate-pulse ml-auto" />
        <div className="h-8 w-56 rounded-full bg-black/5 animate-pulse" />
      </div>
    )
  }

  if (!data || data.messages.length === 0) {
    return (
      <GlassCard padding="lg" className="mt-8">
        <div className="flex flex-col items-center text-center py-6">
          <div className="w-12 h-12 rounded-full bg-white/80 border border-black/5 inline-flex items-center justify-center mb-4">
            <Icon name="chats" size={20} className="text-ink-3" />
          </div>
          <h3 className="text-[18px] font-display font-medium text-ink leading-tight">
            New conversation
          </h3>
          <p className="mt-2 max-w-sm text-[13.5px] text-ink-3 leading-[1.55]">
            Send a payment to start the thread. Both sides see the card the moment it lands.
          </p>
        </div>
      </GlassCard>
    )
  }

  // Real messages would render here
  return null
}

function Composer({ onSend }: { onSend: () => void }) {
  return (
    <div className="mt-8 sticky bottom-4">
      <div className="glass-card p-2 flex items-center gap-2">
        <button
          type="button"
          onClick={onSend}
          aria-label="Send payment"
          className="w-11 h-11 inline-flex items-center justify-center rounded-full bg-[#1D1D1F] text-white hover:bg-black active:scale-95 transition shrink-0"
        >
          <Icon name="dollar" size={18} weight="bold" />
        </button>
        <div className="flex-1 px-3 text-[14px] text-ink-3">
          Tap{' '}
          <span className="font-mono text-ink">$</span> to send a payment.
          Encrypted messages coming next.
        </div>
        <button
          type="button"
          aria-label="Voice"
          className="w-11 h-11 inline-flex items-center justify-center rounded-full bg-black/5 text-ink-3 hover:bg-black/10 transition shrink-0"
        >
          <Icon name="lightning" size={18} />
        </button>
      </div>
    </div>
  )
}
