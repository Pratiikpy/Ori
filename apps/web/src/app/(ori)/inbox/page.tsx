'use client'

/**
 * Inbox page — verbatim layout port of ui-ref-orii/frontend/src/pages/Inbox.jsx
 * with real backend wiring per _protocol/TRIAGE.md (Inbox section).
 *
 * Hook map:
 *   threads list                  → useChats()
 *   active message list           → useChatMessages(chatId)
 *   send encrypted message        → useSendMessage() + libsodium sealed-box
 *   read receipts (best-effort)   → useMarkMessageRead() on inbound view
 *   MCP authorized agents         → distinct agentAddr from useAgentActionsByOwner(initiaAddress)
 *   MCP actions tab               → useAgentActionsByOwner(initiaAddress)
 *   MCP tools tab                 → static `mcpTools` catalogue from the MCP app
 */
import { useEffect, useMemo, useState } from 'react'
import { Bot, CheckCheck, Plus, Send, WalletCards } from 'lucide-react'
import { useInterwovenKit } from '@initia/interwovenkit-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { mcpTools } from '@/data/ori-data'
import { useChats, useChatMessages, useSendMessage, useMarkMessageRead } from '@/hooks/use-chats'
import { useAgentActionsByOwner } from '@/hooks/use-agent-actions'
import { useKeypair } from '@/hooks/use-keypair'
import {
  deriveChatId,
  fromBase64,
  sealedBoxDecrypt,
  sealedBoxEncrypt,
  toBase64,
  utf8Decode,
  utf8Encode,
} from '@/lib/crypto'
import { getRecipientEncryptionPubkey } from '@/lib/api-profile'
import { resolve as resolveIdentifier } from '@/lib/resolve'
import type { ChatSummary } from '@/lib/api-chats'
import type { MessageRow } from '@/lib/api-messages'

type RecentInboxAction = { title: string }

function shortAddr(addr: string | null | undefined): string {
  if (!addr) return ''
  if (addr.length <= 14) return addr
  return `${addr.slice(0, 8)}…${addr.slice(-4)}`
}

function deriveThreadName(chat: ChatSummary): string {
  return chat.counterparty.initName ?? shortAddr(chat.counterparty.initiaAddress)
}

function deriveThreadHandle(chat: ChatSummary): string {
  return chat.counterparty.initName
    ? chat.counterparty.initName
    : shortAddr(chat.counterparty.initiaAddress)
}

type DecryptedMessage = {
  id: string
  text: string
  from: 'me' | 'them'
  meta: string
  raw: MessageRow
}

export default function InboxPage() {
  const { initiaAddress, isConnected } = useInterwovenKit()
  const [chatId, setChatId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [recentAction, setRecentAction] = useState<RecentInboxAction | null>(null)
  // "Start new chat" composer state — accepts a `.init` handle (e.g. `alice.init`)
  // or a raw `init1...` wallet address. Resolves via L1 usernames module
  // (lib/resolve.ts) so we get the canonical address + display name even if
  // the user typed only the bare handle.
  const [newChatInput, setNewChatInput] = useState('')
  const [resolving, setResolving] = useState(false)
  // A "pending" chat synthesized from the resolver result so the right-hand
  // panel renders before any messages exist. Once the user sends the first
  // message, the real chat appears in chatsQuery.data and supersedes this.
  const [pendingChat, setPendingChat] = useState<ChatSummary | null>(null)

  const chatsQuery = useChats()
  const messagesQuery = useChatMessages(chatId)
  const agentActionsQuery = useAgentActionsByOwner(initiaAddress ?? null)
  const sendMessage = useSendMessage()
  const markRead = useMarkMessageRead()
  const { keypair, exists: keypairExists, isLocked, unlock } = useKeypair()

  // Auto-select first chat once chats load
  useEffect(() => {
    if (!chatId && chatsQuery.data?.chats?.length) {
      setChatId(chatsQuery.data.chats[0]!.chatId)
    }
  }, [chatId, chatsQuery.data])

  const activeChat: ChatSummary | null = useMemo(() => {
    const list = chatsQuery.data?.chats ?? []
    // If we just kicked off a new chat via the composer, prefer that — the
    // real chat won't be in `list` until the first message is sent and the
    // chats query refetches.
    if (pendingChat && pendingChat.chatId === chatId) return pendingChat
    if (!list.length) return null
    return list.find((c) => c.chatId === chatId) ?? list[0]!
  }, [chatsQuery.data, chatId, pendingChat])

  // Drop the pendingChat once the real one shows up in the chats list — keeps
  // a single source of truth (with unread count, last-message-at, etc.).
  useEffect(() => {
    if (!pendingChat) return
    const list = chatsQuery.data?.chats ?? []
    if (list.find((c) => c.chatId === pendingChat.chatId)) {
      setPendingChat(null)
    }
  }, [chatsQuery.data, pendingChat])

  /**
   * Resolve a `.init` handle or `init1...` address and prepare a brand-new
   * chat for the composer panel. Doesn't send anything by itself — the user
   * still has to type and submit a message to materialize the thread on
   * the backend.
   */
  async function handleStartNewChat(): Promise<void> {
    const raw = newChatInput.trim()
    if (!raw || !initiaAddress) return
    setResolving(true)
    try {
      const resolved = await resolveIdentifier(raw)
      if (!resolved) {
        toast.error(`Could not resolve "${raw}". Try a .init handle or init1… address.`)
        return
      }
      if (resolved.initiaAddress === initiaAddress) {
        toast.error("That's your own address — can't message yourself.")
        return
      }
      const id = await deriveChatId(initiaAddress, resolved.initiaAddress)
      setPendingChat({
        chatId: id,
        counterparty: {
          initiaAddress: resolved.initiaAddress,
          // hexAddress is unused in the right-panel UI but typed; safe placeholder
          hexAddress: '',
          initName: resolved.initName,
        },
        lastMessageAt: new Date().toISOString(),
        unreadCount: 0,
      })
      setChatId(id)
      setNewChatInput('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to resolve identifier')
    } finally {
      setResolving(false)
    }
  }

  // Decrypt fetched messages
  const [decrypted, setDecrypted] = useState<DecryptedMessage[]>([])
  useEffect(() => {
    const rows = messagesQuery.data?.messages
    if (!rows || !initiaAddress || !keypair) {
      setDecrypted([])
      return
    }
    let cancelled = false
    ;(async () => {
      const out: DecryptedMessage[] = []
      // Reverse so oldest renders first (API typically returns newest-first).
      const ordered = rows.slice().reverse()
      for (const m of ordered) {
        const isMine = m.senderInitiaAddress === initiaAddress
        let text = '(undecryptable on this device)'
        try {
          if (isMine) {
            if (m.senderCiphertextBase64) {
              const ct = fromBase64(m.senderCiphertextBase64)
              const pt = await sealedBoxDecrypt(ct, keypair.publicKey, keypair.privateKey)
              text = utf8Decode(pt)
            } else {
              text = '(older message — sender-copy not stored)'
            }
          } else {
            const ct = fromBase64(m.ciphertextBase64)
            const pt = await sealedBoxDecrypt(ct, keypair.publicKey, keypair.privateKey)
            text = utf8Decode(pt)
          }
        } catch {
          /* keep fallback text */
        }
        const ts = new Date(m.createdAt)
        const meta = `${isMine ? 'sent' : 'received'} • ${ts.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })}${m.readAt ? ' • read' : ''}`
        out.push({
          id: m.id,
          text,
          from: isMine ? 'me' : 'them',
          meta,
          raw: m,
        })
      }
      if (!cancelled) setDecrypted(out)
    })()
    return () => {
      cancelled = true
    }
  }, [messagesQuery.data, initiaAddress, keypair])

  // Best-effort read receipts: any inbound message we just rendered that is
  // unread gets a POST to /v1/messages/:id/read. Triage allows best-effort.
  useEffect(() => {
    if (!decrypted.length || !initiaAddress) return
    const unread = decrypted.filter(
      (m) => m.from === 'them' && !m.raw.readAt,
    )
    for (const m of unread) {
      markRead.mutate(m.id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decrypted.length, initiaAddress])

  const handleSend = async () => {
    if (!draft.trim() || !activeChat || !initiaAddress) return
    if (!keypair) {
      toast.error('Unlock encryption to send', {
        description: keypairExists
          ? 'Tap the unlock prompt to derive your key from a wallet signature.'
          : 'Finish onboarding to provision a keypair on this device.',
      })
      if (keypairExists && isLocked) {
        void unlock()
      }
      return
    }
    setSending(true)
    try {
      const recipient = activeChat.counterparty.initiaAddress
      const recipientPub = await getRecipientEncryptionPubkey(recipient)
      if (!recipientPub) {
        toast.error('Recipient has not published an encryption key yet')
        return
      }
      const plaintextBytes = utf8Encode(draft)
      const ciphertext = await sealedBoxEncrypt(plaintextBytes, recipientPub)
      // Sender-copy: encrypt to ourselves so we can decrypt our own history.
      const senderCiphertext = await sealedBoxEncrypt(plaintextBytes, keypair.publicKey)
      // The backend stores this as an opaque sender proof today.
      const senderSignatureBase64 = toBase64(new Uint8Array(64))
      await sendMessage.mutateAsync({
        chatId: activeChat.chatId,
        recipientInitiaAddress: recipient,
        ciphertextBase64: toBase64(ciphertext),
        senderCiphertextBase64: toBase64(senderCiphertext),
        senderSignatureBase64,
      })
      setRecentAction({
        title: 'Encrypted message sent',
      })
      setDraft('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Send failed')
    } finally {
      setSending(false)
    }
  }

  const authorizedAgents = useMemo(() => {
    const entries = agentActionsQuery.data?.entries ?? []
    const seen = new Map<string, { agentAddr: string; lastTool: string; lastSeen: string }>()
    for (const e of entries) {
      const existing = seen.get(e.agentAddr)
      if (!existing || new Date(e.createdAt) > new Date(existing.lastSeen)) {
        seen.set(e.agentAddr, {
          agentAddr: e.agentAddr,
          lastTool: e.toolName,
          lastSeen: e.createdAt,
        })
      }
    }
    return Array.from(seen.values())
  }, [agentActionsQuery.data])

  const agentActions = agentActionsQuery.data?.entries ?? []

  return (
    <section
      className="grid min-h-[calc(100vh-90px)] grid-cols-1 border-b border-black/10 lg:grid-cols-[320px_1fr_360px]"
      data-testid="inbox-page"
    >
      <aside
        className="border-b border-black/10 bg-[#F5F5F5] p-4 lg:border-b-0 lg:border-r"
        data-testid="thread-list-panel"
      >
        <div className="mb-4 flex items-center justify-between">
          <p
            className="text-xs font-bold uppercase tracking-[0.2em] text-[#52525B]"
            data-testid="thread-list-title"
          >
            Threads
          </p>
          <span className="font-mono text-[10px] text-[#52525B]">
            E2E · sealed-box
          </span>
        </div>

        {/* New chat composer — accepts .init handle OR init1… address.
            Hidden until wallet is connected (resolver needs the user's own
            address to derive the chatId, and the API ignores the request
            without auth). */}
        {isConnected && (
          <form
            className="mb-4 border border-black/10 bg-white p-3"
            data-testid="new-chat-composer"
            onSubmit={(e) => {
              e.preventDefault()
              void handleStartNewChat()
            }}
          >
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[#0022FF]">
              Start a new chat
            </p>
            <div className="flex gap-2">
              <Input
                value={newChatInput}
                onChange={(e) => setNewChatInput(e.target.value)}
                placeholder="alice.init or init1…"
                className="rounded-none border-black/15 font-mono text-xs"
                data-testid="new-chat-input"
                disabled={resolving}
              />
              <Button
                type="submit"
                disabled={!newChatInput.trim() || resolving}
                className="rounded-none bg-[#0022FF] hover:bg-[#0019CC]"
                data-testid="new-chat-submit"
              >
                {resolving ? '…' : <Plus className="h-4 w-4" />}
              </Button>
            </div>
            <p className="mt-2 text-[11px] leading-5 text-[#52525B]">
              Type their .init handle (claimed on Initia L1) or paste their
              init1… wallet address. Messages are end-to-end encrypted with
              libsodium sealed-box — only the recipient can decrypt.
            </p>
          </form>
        )}

        {!isConnected ? (
          <div
            className="border border-black/10 bg-white p-4 text-sm text-[#52525B]"
            data-testid="thread-list-disconnected"
          >
            <p className="font-heading text-base font-bold text-black">Connect wallet</p>
            <p className="mt-2 leading-5">
              Threads, messages, and read receipts only load when your wallet is connected.
            </p>
          </div>
        ) : chatsQuery.isLoading ? (
          <div className="space-y-2" data-testid="thread-list-loading">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-20 w-full animate-pulse border border-black/10 bg-white"
                data-testid={`thread-skeleton-${i}`}
              />
            ))}
          </div>
        ) : chatsQuery.error ? (
          <div
            className="border border-black/10 bg-white p-4 text-sm text-[#0022FF]"
            data-testid="thread-list-error"
          >
            Could not load threads:{' '}
            {chatsQuery.error instanceof Error ? chatsQuery.error.message : 'unknown error'}
          </div>
        ) : !chatsQuery.data?.chats?.length && !pendingChat ? (
          <div
            className="border border-black/10 bg-white p-4 text-sm text-[#52525B]"
            data-testid="thread-list-empty"
          >
            <p className="font-heading text-base font-bold text-black">No threads yet</p>
            <p className="mt-2 leading-5">
              Use the box above to start a conversation. Once you send your
              first encrypted message, the thread shows up here. Threads are
              sorted by latest message and show unread counts in blue.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {(chatsQuery.data?.chats ?? []).map((chat) => {
              const name = deriveThreadName(chat)
              const handle = deriveThreadHandle(chat)
              const isActive = chat.chatId === (activeChat?.chatId ?? chatId)
              const last = chat.lastMessageAt
                ? new Date(chat.lastMessageAt).toLocaleString([], {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : '—'
              return (
                <button
                  key={chat.chatId}
                  onClick={() => setChatId(chat.chatId)}
                  className={`w-full border p-4 text-left transition-colors ${
                    isActive
                      ? 'border-[#0022FF] bg-white shadow-[4px_4px_0px_0px_rgba(0,34,255,1)]'
                      : 'border-black/10 bg-white hover:border-black'
                  }`}
                  data-testid={`thread-select-${chat.chatId}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span
                      className="font-heading text-lg font-bold"
                      data-testid={`thread-name-${chat.chatId}`}
                    >
                      {name}
                    </span>
                    <span
                      className="font-mono text-xs text-[#0022FF]"
                      data-testid={`thread-unread-${chat.chatId}`}
                    >
                      {chat.unreadCount}
                    </span>
                  </div>
                  <p
                    className="mt-1 font-mono text-xs text-[#52525B]"
                    data-testid={`thread-handle-${chat.chatId}`}
                  >
                    {handle}
                  </p>
                  <p
                    className="mt-3 text-sm text-[#52525B]"
                    data-testid={`thread-last-${chat.chatId}`}
                  >
                    {last}
                  </p>
                </button>
              )
            })}
          </div>
        )}
      </aside>

      <div className="flex min-h-[620px] flex-col" data-testid="message-panel">
        {!isConnected ? (
          <div
            className="flex flex-1 items-center justify-center p-10 text-center"
            data-testid="message-panel-disconnected"
          >
            <div className="border border-black/10 bg-white p-8">
              <p className="font-heading text-xl font-black tracking-tight">Connect wallet</p>
              <p className="mt-3 max-w-sm text-sm leading-6 text-[#52525B]">
                Encrypted messages live behind a wallet-bound keypair. Connect to load your
                conversations.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="border-b border-black/10 p-5" data-testid="active-thread-header">
              <p
                className="text-xs font-bold uppercase tracking-[0.2em] text-[#52525B]"
                data-testid="active-thread-kind"
              >
                {activeChat ? 'Encrypted DM' : 'No thread'}
              </p>
              <h2
                className="font-heading text-3xl font-black tracking-tight"
                data-testid="active-thread-name"
              >
                {activeChat ? deriveThreadName(activeChat) : '—'}
              </h2>
              <div
                className="mt-1 flex flex-wrap items-center gap-3 font-mono text-xs text-[#52525B]"
                data-testid="active-thread-presence-row"
              >
                <span data-testid="active-thread-handle">
                  {activeChat ? deriveThreadHandle(activeChat) : ''}
                </span>
                <span
                  className="flex items-center gap-1 text-[#00A858]"
                  data-testid="active-thread-online"
                >
                  <span className="h-2 w-2 animate-pulse rounded-full bg-[#00C566]" /> online
                </span>
                <span data-testid="active-thread-typing">typing dots ready</span>
                <span data-testid="active-thread-read-receipt">
                  <CheckCheck className="inline h-3 w-3" /> read receipts on
                </span>
              </div>
            </div>

            <div
              className="flex-1 space-y-4 overflow-y-auto bg-white p-5"
              data-testid="message-list"
            >
              {!activeChat ? (
                <p className="text-sm text-[#52525B]" data-testid="message-list-empty">
                  Select a thread to load messages.
                </p>
              ) : isLocked ? (
                <div
                  className="border border-black/10 bg-[#F5F5F5] p-4"
                  data-testid="message-list-locked"
                >
                  <p className="font-heading text-base font-bold">Unlock encryption</p>
                  <p className="mt-2 text-sm text-[#52525B]">
                    Your X25519 keypair is on this device but locked. Sign once with your wallet
                    to read this thread.
                  </p>
                  <Button
                    onClick={() => void unlock()}
                    className="mt-3 rounded-none bg-[#0022FF] hover:bg-[#0019CC]"
                    data-testid="message-list-unlock"
                  >
                    Unlock
                  </Button>
                </div>
              ) : messagesQuery.isLoading ? (
                <div className="space-y-3" data-testid="message-list-loading">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="h-16 max-w-[60%] animate-pulse border border-black/10 bg-[#F5F5F5]"
                    />
                  ))}
                </div>
              ) : messagesQuery.error ? (
                <p className="text-sm text-[#0022FF]" data-testid="message-list-error">
                  Failed to load messages:{' '}
                  {messagesQuery.error instanceof Error
                    ? messagesQuery.error.message
                    : 'unknown error'}
                </p>
              ) : decrypted.length === 0 ? (
                <div
                  className="border border-dashed border-black/15 bg-white p-4 text-sm text-[#52525B]"
                  data-testid="message-list-empty-thread"
                >
                  <p className="font-heading text-base font-bold text-black">
                    Empty thread — say hi
                  </p>
                  <p className="mt-2 leading-5">
                    Type a message below and hit send. We'll encrypt it with
                    the recipient's on-chain X25519 pubkey via libsodium
                    sealed-box, then post the ciphertext to the API. The
                    backend can't read it — only the recipient's keypair can.
                  </p>
                </div>
              ) : (
                decrypted.map((message) => (
                  <div
                    key={message.id}
                    className={`max-w-[82%] border p-4 ${
                      message.from === 'me'
                        ? 'ml-auto border-[#0022FF] bg-[#0022FF] text-white'
                        : 'border-black/10 bg-[#F5F5F5]'
                    }`}
                    data-testid={`message-${message.id}`}
                  >
                    <p
                      className="text-sm leading-6"
                      data-testid={`message-text-${message.id}`}
                    >
                      {message.text}
                    </p>
                    <p
                      className={`mt-3 font-mono text-[11px] ${
                        message.from === 'me' ? 'text-white/80' : 'text-[#52525B]'
                      }`}
                      data-testid={`message-meta-${message.id}`}
                    >
                      {message.meta}
                    </p>
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-black/10 p-4" data-testid="composer-panel">
              <div className="flex items-stretch gap-2">
                <Input
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      void handleSend()
                    }
                  }}
                  placeholder="Write encrypted message..."
                  className="h-12 min-w-0 rounded-none border-black/20 text-sm"
                  data-testid="message-composer-input"
                  disabled={!activeChat || sending}
                />
                <Button
                  onClick={() => void handleSend()}
                  className="h-12 shrink-0 rounded-none bg-[#0022FF] px-4 hover:bg-[#0019CC]"
                  data-testid="message-send-button"
                  aria-label="Send encrypted message"
                  disabled={!activeChat || !draft.trim() || sending}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              {recentAction && (
                <p className="mt-3 text-sm text-[#0022FF]" data-testid="inbox-recent-action">
                  <CheckCheck className="mr-1 inline h-4 w-4" />
                  {recentAction.title}
                </p>
              )}
            </div>
          </>
        )}
      </div>

      <aside
        className="border-t border-black/10 bg-[#F5F5F5] p-4 lg:border-l lg:border-t-0"
        data-testid="agent-panel"
      >
        <div className="mb-5 border border-black/10 bg-white p-4" data-testid="agent-card">
          <p
            className="text-xs font-bold uppercase tracking-[0.2em] text-[#52525B]"
            data-testid="agent-card-kicker"
          >
            MCP control room
          </p>
          <h3
            className="mt-2 font-heading text-xl font-black tracking-tight"
            data-testid="agent-name"
          >
            Authorized agents
          </h3>
          <p className="mt-2 text-sm leading-5 text-[#52525B]" data-testid="agent-explanation">
            Claude runs outside Ori. This panel only shows policy, allowed tools, and action logs.
          </p>

          {!isConnected ? (
            <div
              className="mt-4 border border-black/10 p-3 text-sm text-[#52525B]"
              data-testid="authorized-agents-disconnected"
            >
              Connect wallet to load agent activity for your address.
            </div>
          ) : agentActionsQuery.isLoading ? (
            <div
              className="mt-4 h-20 w-full animate-pulse border border-black/10 bg-[#F5F5F5]"
              data-testid="authorized-agents-loading"
            />
          ) : agentActionsQuery.error ? (
            <div
              className="mt-4 border border-black/10 p-3 font-mono text-xs text-[#0022FF]"
              data-testid="authorized-agents-error"
            >
              Could not load agent actions.
            </div>
          ) : authorizedAgents.length === 0 ? (
            <div
              className="mt-4 flex items-center justify-between gap-2 border border-black/10 p-3"
              data-testid="authorized-agents-empty"
            >
              <p className="text-sm text-[#52525B]">
                No agents have acted on your behalf yet.
              </p>
            </div>
          ) : (
            authorizedAgents.map((agent) => (
              <div
                key={agent.agentAddr}
                className="mt-4 border border-black/10 p-3"
                data-testid={`authorized-agent-${agent.agentAddr}`}
              >
                <p
                  className="font-heading text-base font-bold"
                  data-testid={`authorized-agent-name-${agent.agentAddr}`}
                >
                  {shortAddr(agent.agentAddr)}
                </p>
                <p
                  className="font-mono text-xs text-[#52525B]"
                  data-testid={`authorized-agent-address-${agent.agentAddr}`}
                >
                  {agent.agentAddr}
                </p>
                <p
                  className="mt-2 font-mono text-xs text-[#0022FF]"
                  data-testid={`authorized-agent-cap-${agent.agentAddr}`}
                >
                  last tool · {agent.lastTool}
                </p>
              </div>
            ))
          )}
        </div>
        <Tabs defaultValue="actions" data-testid="inbox-agent-tabs">
          <TabsList
            className="grid h-auto grid-cols-2 rounded-none bg-white p-0"
            data-testid="agent-tabs-list"
          >
            <TabsTrigger
              value="actions"
              className="rounded-none data-[state=active]:bg-black data-[state=active]:text-white"
              data-testid="agent-actions-tab"
            >
              <Bot className="mr-2 h-4 w-4" />
              Actions
            </TabsTrigger>
            <TabsTrigger
              value="tools"
              className="rounded-none data-[state=active]:bg-black data-[state=active]:text-white"
              data-testid="agent-tools-tab"
            >
              <WalletCards className="mr-2 h-4 w-4" />
              MCP tools
            </TabsTrigger>
          </TabsList>
          <TabsContent value="actions" className="mt-4 space-y-3" data-testid="agent-actions-content">
            {!isConnected ? (
              <div
                className="border border-black/10 bg-white p-4 text-sm text-[#52525B]"
                data-testid="agent-actions-disconnected"
              >
                Connect wallet to view agent action history.
              </div>
            ) : agentActionsQuery.isLoading ? (
              <div
                className="h-24 w-full animate-pulse border border-black/10 bg-white"
                data-testid="agent-actions-loading"
              />
            ) : agentActions.length === 0 ? (
              <div
                className="flex items-center justify-between gap-2 border border-black/10 bg-white p-4"
                data-testid="agent-actions-empty"
              >
                <p className="text-sm text-[#52525B]">No agent actions logged for your address.</p>
              </div>
            ) : (
              agentActions.map((item) => {
                const detail = (() => {
                  try {
                    if (item.args == null) return item.toolName
                    if (typeof item.args === 'string') return item.args
                    return JSON.stringify(item.args)
                  } catch {
                    return item.toolName
                  }
                })()
                const statusColor =
                  item.status === 'success'
                    ? 'text-[#00A858]'
                    : item.status === 'failed'
                      ? 'text-[#D14343]'
                      : 'text-[#52525B]'
                return (
                  <div
                    key={item.id}
                    className="border border-black/10 bg-white p-4"
                    data-testid={`agent-action-${item.id}`}
                  >
                    <p
                      className="font-mono text-xs text-[#0022FF]"
                      data-testid={`agent-action-name-${item.id}`}
                    >
                      {item.toolName}
                    </p>
                    <p
                      className="mt-2 break-words text-sm font-semibold"
                      data-testid={`agent-action-detail-${item.id}`}
                    >
                      {detail}
                    </p>
                    <p
                      className="mt-2 font-mono text-xs text-[#52525B]"
                      data-testid={`agent-action-actor-${item.id}`}
                    >
                      {shortAddr(item.agentAddr)}
                    </p>
                    <p
                      className={`mt-2 font-mono text-xs uppercase tracking-[0.15em] ${statusColor}`}
                      data-testid={`agent-action-cap-${item.id}`}
                    >
                      {item.status}
                    </p>
                  </div>
                )
              })
            )}
          </TabsContent>
          <TabsContent
            value="tools"
            className="mt-4 grid grid-cols-1 gap-3"
            data-testid="mcp-tools-content"
          >
            {mcpTools.map((tool) => (
              <article
                key={tool}
                className="border border-black/10 bg-white p-4"
                data-testid={`mcp-tool-${tool.replaceAll('.', '-')}`}
              >
                <p className="font-mono text-xs text-[#52525B]" data-testid={`mcp-tool-contract-${tool.replaceAll('.', '-')}`}>
                  MCP stdio tool
                </p>
                <h3 className="mt-2 font-heading text-lg font-bold" data-testid={`mcp-tool-title-${tool.replaceAll('.', '-')}`}>
                  {tool}
                </h3>
              </article>
            ))}
          </TabsContent>
        </Tabs>
      </aside>
    </section>
  )
}
