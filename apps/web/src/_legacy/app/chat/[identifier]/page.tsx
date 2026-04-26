'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useInterwovenKit } from '@initia/interwovenkit-react'
import { Check, CheckCheck, ChevronLeft, Lock } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

import { AppShell } from '@/components/app-shell'
import { ChatComposer } from '@/components/chat-composer'
import { PaymentCard } from '@/components/payment-card'
import { PaymentRequestCard } from '@/components/payment-request-card'
import { BillSplitModal } from '@/components/bill-split-modal'
import { BillSplitCard } from '@/components/bill-split-card'
import { WagerModal } from '@/components/wager-modal'
import { WagerCard } from '@/components/wager-card'
import { useSession } from '@/hooks/use-session'
import { useKeypair } from '@/hooks/use-keypair'
import { useResolve } from '@/hooks/use-resolve'
import { useTypingIndicator } from '@/hooks/use-typing-indicator'
import { usePresenceSet } from '@/hooks/use-presence-set'
import { fetchMessages, type StoredMessage, markMessageRead } from '@/lib/api'
import { getSocket } from '@/lib/ws'
import { deriveChatId, fromBase64, sealedBoxDecrypt, utf8Decode } from '@/lib/crypto'
import { decodeStructured } from '@/lib/message-kinds'
import { ORI_DENOM } from '@/lib/chain-config'
import type { WsMessageNewPayload } from '@ori/shared-types'

type TextUI = {
  kind: 'text'
  id: string
  direction: 'sent' | 'received'
  text: string
  createdAtMs: number
  deliveredAt: string | null
  readAt: string | null
}
type PaymentUI = {
  kind: 'payment'
  id: string
  direction: 'sent' | 'received'
  amount: bigint
  denom: string
  memo: string
  txHash: string
  createdAtMs: number
}
type WagerUI = {
  kind: 'wager'
  id: string
  wagerId: bigint
  proposer: string
  accepter: string
  arbiter: string
  amount: bigint
  claim: string
  status: 'pending' | 'active' | 'resolved' | 'cancelled'
  winner?: string | null
  direction: 'sent' | 'received'
  createdAtMs: number
}
type PaymentRequestUI = {
  kind: 'payment_request'
  id: string
  direction: 'sent' | 'received'
  amount: bigint
  denom: string
  memo: string
  nonce: string
  createdAtMs: number
  status: 'pending' | 'paid'
}
type BillSplitUI = {
  kind: 'bill_split'
  id: string
  direction: 'sent' | 'received'
  totalAmount: bigint
  denom: string
  participants: number
  perShare: bigint
  memo: string
  nonce: string
  createdAtMs: number
  status: 'pending' | 'paid'
}
type UIMessage = TextUI | PaymentUI | WagerUI | PaymentRequestUI | BillSplitUI

export default function ChatPage() {
  const router = useRouter()
  const { identifier } = useParams<{ identifier: string }>()
  const decoded = useMemo(() => decodeURIComponent(identifier ?? ''), [identifier])

  const { initiaAddress, isConnected } = useInterwovenKit()
  const { isAuthenticated, status } = useSession()
  const { keypair, unlock } = useKeypair()
  const { data: resolved, isLoading: resolving, error: resolveErr } = useResolve(decoded)

  const [showWager, setShowWager] = useState(false)
  const [showSplit, setShowSplit] = useState(false)
  const [chatId, setChatId] = useState<string | null>(null)
  const [uiMessages, setUiMessages] = useState<UIMessage[]>([])
  const scrollRef = useRef<HTMLDivElement | null>(null)

  const counterparties = useMemo(
    () => (resolved?.initiaAddress ? [resolved.initiaAddress] : []),
    [resolved?.initiaAddress],
  )
  const onlineSet = usePresenceSet(counterparties)
  const counterpartyOnline = resolved ? onlineSet.has(resolved.initiaAddress) : false

  const { remoteTyping } = useTypingIndicator({
    chatId,
    recipientAddress: resolved?.initiaAddress ?? null,
  })

  useEffect(() => {
    if (!isConnected) router.replace('/')
    else if (status === 'unauthenticated') router.replace('/onboard')
  }, [isConnected, status, router])

  useEffect(() => {
    if (!initiaAddress || !resolved?.initiaAddress) return
    let cancelled = false
    deriveChatId(initiaAddress, resolved.initiaAddress).then((id) => {
      if (!cancelled) setChatId(id)
    })
    return () => {
      cancelled = true
    }
  }, [initiaAddress, resolved?.initiaAddress])

  const { data: historyData } = useQuery({
    queryKey: ['messages', chatId],
    queryFn: () => fetchMessages(chatId!, { limit: 100 }),
    enabled: Boolean(chatId && isAuthenticated),
    staleTime: 0,
  })

  useEffect(() => {
    if (!historyData?.messages || !keypair || !initiaAddress || !resolved) return
    let cancelled = false
    ;(async () => {
      const decrypted = await Promise.all(
        historyData.messages
          .slice()
          .reverse()
          .map((m) => decryptStoredMessage(m, initiaAddress, keypair)),
      )
      if (!cancelled) setUiMessages(decrypted.filter((x): x is UIMessage => x !== null))
    })()
    return () => {
      cancelled = true
    }
  }, [historyData, keypair, initiaAddress, resolved])

  useEffect(() => {
    if (!chatId || !isAuthenticated || !keypair || !initiaAddress) return
    const socket = getSocket()
    if (!socket) return
    const onNew = async (payload: WsMessageNewPayload) => {
      if (payload.chatId !== chatId) return
      const direction = payload.senderInitiaAddress === initiaAddress ? 'sent' : 'received'
      const stored: StoredMessage = {
        id: payload.id,
        chatId: payload.chatId,
        senderId: '',
        recipientId: '',
        senderInitiaAddress: payload.senderInitiaAddress,
        recipientInitiaAddress: payload.recipientInitiaAddress,
        ciphertextBase64: payload.ciphertextBase64,
        senderCiphertextBase64: null,
        senderSignatureBase64: payload.senderSignatureBase64,
        createdAt: payload.createdAt,
        deliveredAt: null,
        readAt: null,
      }
      const ui = await decryptStoredMessage(stored, initiaAddress, keypair, direction)
      if (!ui) return
      setUiMessages((prev) => (prev.some((m) => m.id === ui.id) ? prev : [...prev, ui]))
      if (direction === 'received') {
        void markMessageRead(payload.id).catch(() => {})
      }
    }
    socket.on('message.new', onNew)
    return () => {
      socket.off('message.new', onNew)
    }
  }, [chatId, isAuthenticated, keypair, initiaAddress])

  useEffect(() => {
    if (!scrollRef.current) return
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [uiMessages.length, remoteTyping])

  const title = resolved?.initName ?? decoded

  return (
    <AppShell title={title} hideNav>
      <div className="border-b border-border px-4 h-14 flex items-center gap-3">
        <Link href="/chats" aria-label="Back" className="text-muted-foreground hover:text-foreground">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <HeaderAvatar
          seed={resolved?.initiaAddress ?? decoded}
          online={counterpartyOnline}
          typing={remoteTyping}
          initials={(resolved?.initName ?? decoded).slice(0, 2).toUpperCase()}
        />
        <div className="flex flex-col min-w-0 flex-1">
          <span className="font-medium truncate">{title}</span>
          {resolved && (
            <span className="text-[11px] font-mono text-muted-foreground truncate">
              {resolved.initiaAddress.slice(0, 14)}…{resolved.initiaAddress.slice(-6)}
            </span>
          )}
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-4 space-y-2">
        {resolving && <div className="text-center text-muted-foreground">Resolving…</div>}
        {resolveErr && (
          <div className="text-center text-danger">
            Could not resolve {decoded}: {String(resolveErr.message ?? resolveErr)}
          </div>
        )}
        {resolved && !keypair && (
          <div className="mx-auto max-w-sm rounded-2xl border border-border bg-muted/50 p-4 text-center">
            <Lock className="w-5 h-5 mx-auto mb-2 text-primary" />
            <div className="text-sm">Unlock encryption to see this conversation.</div>
            <button
              onClick={() => void unlock()}
              className="mt-3 rounded-full px-4 h-9 bg-primary text-primary-foreground text-sm font-medium"
            >
              Unlock
            </button>
          </div>
        )}
        {uiMessages.map((m) => renderMessage(m))}
        {remoteTyping && (
          <div className="inline-flex items-center gap-1 text-xs text-muted-foreground italic">
            <span className="inline-flex gap-0.5">
              <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </span>
            {title} is typing…
          </div>
        )}
      </div>

      {resolved && chatId && (
        <ChatComposer
          chatId={chatId}
          recipientAddress={resolved.initiaAddress}
          recipientInitName={resolved.initName}
          keypair={keypair}
          onLocalMessage={(local) =>
            setUiMessages((prev) => [
              ...prev,
              {
                kind: 'text',
                id: local.id,
                text: local.plaintext,
                direction: 'sent',
                createdAtMs: local.createdAtMs,
                deliveredAt: null,
                readAt: null,
              },
            ])
          }
          onPayment={(p) =>
            setUiMessages((prev) => {
              // If this payment matches an unpaid inbound request (same amount,
              // sender is me, recipient was asking), flip that card to "paid"
              // and also render the payment card.
              const updated = prev.map((m) => {
                if (
                  m.kind === 'payment_request' &&
                  m.direction === 'received' &&
                  m.status === 'pending' &&
                  m.amount === p.amount
                ) {
                  return { ...m, status: 'paid' as const }
                }
                return m
              })
              return [
                ...updated,
                {
                  kind: 'payment',
                  id: 'local-' + Date.now(),
                  amount: p.amount,
                  denom: 'umin',
                  memo: p.memo,
                  txHash: p.txHash,
                  direction: 'sent',
                  createdAtMs: p.timestampMs,
                },
              ]
            })
          }
          onRequest={(r) =>
            setUiMessages((prev) => [
              ...prev,
              {
                kind: 'payment_request',
                id: r.id,
                direction: 'sent',
                amount: r.amount,
                denom: ORI_DENOM,
                memo: r.memo,
                nonce: r.nonce,
                createdAtMs: r.createdAtMs,
                status: 'pending',
              },
            ])
          }
          onOpenWager={() => setShowWager(true)}
          onOpenSplit={() => setShowSplit(true)}
          onRequestUnlock={() => {
            void unlock().catch((e) =>
              toast.error(e instanceof Error ? e.message : 'Unlock failed'),
            )
          }}
        />
      )}

      {showSplit && resolved && chatId && (
        <BillSplitModal
          open={showSplit}
          onClose={() => setShowSplit(false)}
          chatId={chatId}
          recipientAddress={resolved.initiaAddress}
          recipientInitName={resolved.initName}
          keypair={keypair}
          onSent={(s) =>
            setUiMessages((prev) => [
              ...prev,
              {
                kind: 'bill_split',
                id: s.id,
                direction: 'sent',
                totalAmount: s.totalAmount,
                denom: ORI_DENOM,
                participants: s.participants,
                perShare: s.perShare,
                memo: s.memo,
                nonce: 'local-' + String(s.createdAtMs),
                createdAtMs: s.createdAtMs,
                status: 'pending',
              },
            ])
          }
        />
      )}

      {showWager && resolved && chatId && initiaAddress && (
        <WagerModal
          chatId={chatId}
          recipientAddress={resolved.initiaAddress}
          recipientInitName={resolved.initName}
          onClose={() => setShowWager(false)}
          onProposed={(w) =>
            setUiMessages((prev) => [
              ...prev,
              {
                kind: 'wager',
                id: 'wager-' + String(w.wagerId),
                wagerId: w.wagerId,
                proposer: initiaAddress,
                accepter: w.accepter,
                arbiter: w.arbiter,
                amount: w.amount,
                claim: w.claim,
                status: 'pending',
                direction: 'sent',
                createdAtMs: Date.now(),
              },
            ])
          }
        />
      )}
    </AppShell>
  )

  function renderMessage(m: UIMessage) {
    if (m.kind === 'text') {
      const isSent = m.direction === 'sent'
      return (
        <div
          key={m.id}
          className={
            'max-w-[82%] rounded-2xl px-3 py-2 break-words ' +
            (isSent ? 'ml-auto bg-primary text-primary-foreground' : 'bg-muted')
          }
        >
          <div>{m.text}</div>
          {isSent && (
            <div className="mt-0.5 flex justify-end opacity-60">
              {m.readAt ? (
                <CheckCheck className="w-3 h-3" aria-label="read" />
              ) : (
                <Check className="w-3 h-3" aria-label="sent" />
              )}
            </div>
          )}
        </div>
      )
    }
    if (m.kind === 'payment') {
      return (
        <PaymentCard
          key={m.id}
          data={{
            direction: m.direction,
            amount: m.amount,
            denom: m.denom,
            memo: m.memo,
            txHash: m.txHash,
            timestampMs: m.createdAtMs,
          }}
        />
      )
    }
    if (m.kind === 'bill_split') {
      if (!resolved || !initiaAddress || !chatId) return null
      const creditorAddress = m.direction === 'sent' ? initiaAddress : resolved.initiaAddress
      const creditorDisplayName =
        m.direction === 'sent' ? 'you' : resolved.initName ?? 'they'
      return (
        <BillSplitCard
          key={m.id}
          data={{
            direction: m.direction,
            totalAmount: m.totalAmount,
            denom: m.denom,
            participants: m.participants,
            perShare: m.perShare,
            memo: m.memo,
            chatId,
            creditorAddress,
            creditorDisplayName,
            status: m.status,
          }}
          onPaid={(p) =>
            setUiMessages((prev) => {
              const updated = prev.map((x) =>
                x.id === m.id && x.kind === 'bill_split'
                  ? { ...x, status: 'paid' as const }
                  : x,
              )
              return [
                ...updated,
                {
                  kind: 'payment',
                  id: 'local-bs-' + Date.now(),
                  amount: p.amount,
                  denom: p.denom,
                  memo: p.memo,
                  txHash: p.txHash,
                  direction: 'sent',
                  createdAtMs: Date.now(),
                },
              ]
            })
          }
        />
      )
    }
    if (m.kind === 'payment_request') {
      if (!resolved || !initiaAddress || !chatId) return null
      // When I sent the request → the requester is me.
      // When I received the request → the requester is the counterparty.
      const requesterAddress = m.direction === 'sent' ? initiaAddress : resolved.initiaAddress
      const requesterDisplayName =
        m.direction === 'sent' ? 'you' : resolved.initName ?? 'they'
      return (
        <PaymentRequestCard
          key={m.id}
          data={{
            direction: m.direction,
            amount: m.amount,
            denom: m.denom,
            memo: m.memo,
            chatId,
            requesterAddress,
            requesterDisplayName,
            status: m.status,
          }}
          onPaid={(p) =>
            setUiMessages((prev) => {
              const updated = prev.map((x) =>
                x.id === m.id && x.kind === 'payment_request'
                  ? { ...x, status: 'paid' as const }
                  : x,
              )
              return [
                ...updated,
                {
                  kind: 'payment',
                  id: 'local-pay-' + Date.now(),
                  amount: p.amount,
                  denom: p.denom,
                  memo: p.memo,
                  txHash: p.txHash,
                  direction: 'sent',
                  createdAtMs: Date.now(),
                },
              ]
            })
          }
        />
      )
    }
    return (
      <WagerCard
        key={m.id}
        data={{
          wagerId: m.wagerId,
          proposer: m.proposer,
          accepter: m.accepter,
          arbiter: m.arbiter,
          amount: m.amount,
          claim: m.claim,
          status: m.status,
          winner: m.winner,
        }}
        onStatusChange={(next) =>
          setUiMessages((prev) =>
            prev.map((x) =>
              x.id === m.id && x.kind === 'wager'
                ? { ...x, status: next.status, winner: next.winner ?? null }
                : x,
            ),
          )
        }
      />
    )
  }
}

async function decryptStoredMessage(
  msg: StoredMessage,
  myAddress: string,
  keypair: { publicKey: Uint8Array; privateKey: Uint8Array },
  directionOverride?: 'sent' | 'received',
): Promise<UIMessage | null> {
  const direction: 'sent' | 'received' =
    directionOverride ?? (msg.senderInitiaAddress === myAddress ? 'sent' : 'received')
  const createdAtMs = new Date(msg.createdAt).getTime()

  const plainTextFallback = (text: string): UIMessage => ({
    kind: 'text',
    id: msg.id,
    direction,
    text,
    createdAtMs,
    deliveredAt: msg.deliveredAt,
    readAt: msg.readAt,
  })

  const buildFromPlaintext = (raw: string): UIMessage => {
    const structured = decodeStructured(raw)
    if (structured?.kind === 'payment_request') {
      return {
        kind: 'payment_request',
        id: msg.id,
        direction,
        amount: BigInt(structured.amount),
        denom: structured.denom,
        memo: structured.memo ?? '',
        nonce: structured.nonce,
        createdAtMs,
        status: 'pending',
      }
    }
    if (structured?.kind === 'split_bill') {
      const total = BigInt(structured.totalAmount)
      const participants = Math.max(2, structured.participants.length)
      return {
        kind: 'bill_split',
        id: msg.id,
        direction,
        totalAmount: total,
        denom: structured.denom,
        participants,
        perShare: total / BigInt(participants),
        memo: structured.memo ?? '',
        nonce: structured.nonce,
        createdAtMs,
        status: 'pending',
      }
    }
    return plainTextFallback(raw)
  }

  try {
    if (direction === 'sent') {
      if (msg.senderCiphertextBase64) {
        const ct = fromBase64(msg.senderCiphertextBase64)
        const plaintext = await sealedBoxDecrypt(ct, keypair.publicKey, keypair.privateKey)
        return buildFromPlaintext(utf8Decode(plaintext))
      }
      return plainTextFallback('(older message — sender-copy not stored)')
    }
    const ciphertext = fromBase64(msg.ciphertextBase64)
    const plaintext = await sealedBoxDecrypt(ciphertext, keypair.publicKey, keypair.privateKey)
    return buildFromPlaintext(utf8Decode(plaintext))
  } catch {
    return plainTextFallback('(undecryptable on this device)')
  }
}

/**
 * Chat-header avatar with a status ring. Three visual states:
 *   typing  → primary-color ring with a soft pulse (active thinking)
 *   online  → success-color ring (present but idle)
 *   offline → flat muted ring
 *
 * The seed-gradient means every .init has a distinct look without us ever
 * asking for an image upload — identity feels earned even on day one.
 */
function HeaderAvatar({
  seed,
  online,
  typing,
  initials,
}: {
  seed: string
  online: boolean
  typing: boolean
  initials: string
}) {
  const hash = Array.from(seed).reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 0)
  const hue1 = hash % 360
  const hue2 = (hue1 + 60) % 360
  const ring = typing
    ? 'ring-2 ring-primary animate-pulse'
    : online
      ? 'ring-2 ring-success'
      : 'ring-1 ring-border'
  return (
    <div
      aria-label={typing ? 'typing' : online ? 'online' : 'offline'}
      className={`relative w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0 ${ring}`}
      style={{ background: `linear-gradient(135deg, hsl(${hue1} 70% 45%), hsl(${hue2} 70% 55%))` }}
    >
      {initials}
    </div>
  )
}
