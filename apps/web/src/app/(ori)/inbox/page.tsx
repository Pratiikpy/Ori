'use client'

/**
 * Inbox page — verbatim port of ui-ref-orii/frontend/src/pages/Inbox.jsx.
 *
 * The reference uses static `threads` mock data. Real wiring:
 *   threads → encrypted DM fetcher in lib/api-chats. (TODO: real data.)
 *   authorized agents → agent_policy.move query for the connected user.
 *   agent actions → event-listener feed.
 *   mcp tools → static catalogue, can stay.
 *
 * The composer's send button currently only updates local state. Real
 * wiring goes through msgPostMessage in lib/contracts + useAutoSign.
 */
import { useMemo, useState } from 'react'
import { Bot, CheckCheck, Send, WalletCards } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ActionCard, ActionDialog, type Action, type ActionRecord } from '@/components/action-dialog'
import { agentActions, authorizedAgents, mcpTools, threads } from '@/data/ori-data'

const quickActions: Action[] = [
  { id: 'encrypted-dm', title: 'Send encrypted DM', contract: '/v1/messages', fields: ['Thread', 'Encrypted payload'] },
  { id: 'mark-read', title: 'Mark message read', contract: '/v1/messages/:id/read', fields: ['Message ID'] },
  { id: 'thread-payment', title: 'Pay from chat', contract: 'ori.send_payment', fields: ['Recipient', 'Amount', 'Memo'] },
  { id: 'thread-gift', title: 'Create chat gift', contract: 'ori.create_link_gift', fields: ['Amount', 'Shortcode'] },
]

export default function InboxPage() {
  const [threadId, setThreadId] = useState<string>(threads[0].id)
  const [draft, setDraft] = useState('')
  const [modalAction, setModalAction] = useState<Action | null>(null)
  const [recentAction, setRecentAction] = useState<ActionRecord | null>(null)
  const activeThread = useMemo(
    () => threads.find((thread) => thread.id === threadId) ?? threads[0],
    [threadId],
  )

  const sendMessage = () => {
    if (draft.trim()) {
      setRecentAction({
        id: 'encrypted-dm',
        title: 'Encrypted message sent',
        contract: '/v1/messages',
        values: {},
        time: 'now',
      })
      setDraft('')
    }
  }

  return (
    <section
      className="grid min-h-[calc(100vh-90px)] grid-cols-1 border-b border-black/10 lg:grid-cols-[320px_1fr_360px]"
      data-testid="inbox-page"
    >
      <aside
        className="border-b border-black/10 bg-[#F5F5F5] p-4 lg:border-b-0 lg:border-r"
        data-testid="thread-list-panel"
      >
        <p
          className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-[#52525B]"
          data-testid="thread-list-title"
        >
          Threads
        </p>
        <div className="space-y-2">
          {threads.map((thread) => (
            <button
              key={thread.id}
              onClick={() => setThreadId(thread.id)}
              className={`w-full border p-4 text-left transition-colors ${
                thread.id === threadId
                  ? 'border-[#0022FF] bg-white shadow-[4px_4px_0px_0px_rgba(0,34,255,1)]'
                  : 'border-black/10 bg-white hover:border-black'
              }`}
              data-testid={`thread-select-${thread.id}`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-heading text-lg font-bold" data-testid={`thread-name-${thread.id}`}>
                  {thread.name}
                </span>
                <span className="font-mono text-xs text-[#0022FF]" data-testid={`thread-unread-${thread.id}`}>
                  {thread.unread}
                </span>
              </div>
              <p className="mt-1 font-mono text-xs text-[#52525B]" data-testid={`thread-handle-${thread.id}`}>
                {thread.handle}
              </p>
              <p className="mt-3 text-sm text-[#52525B]" data-testid={`thread-last-${thread.id}`}>
                {thread.last}
              </p>
            </button>
          ))}
        </div>
      </aside>

      <div className="flex min-h-[620px] flex-col" data-testid="message-panel">
        <div className="border-b border-black/10 p-5" data-testid="active-thread-header">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#52525B]" data-testid="active-thread-kind">
            {activeThread.kind}
          </p>
          <h2 className="font-heading text-3xl font-black tracking-tight" data-testid="active-thread-name">
            {activeThread.name}
          </h2>
          <div
            className="mt-1 flex flex-wrap items-center gap-3 font-mono text-xs text-[#52525B]"
            data-testid="active-thread-presence-row"
          >
            <span data-testid="active-thread-handle">{activeThread.handle}</span>
            <span className="flex items-center gap-1 text-[#00A858]" data-testid="active-thread-online">
              <span className="h-2 w-2 animate-pulse rounded-full bg-[#00C566]" /> online
            </span>
            <span data-testid="active-thread-typing">typing dots ready</span>
            <span data-testid="active-thread-read-receipt">
              <CheckCheck className="inline h-3 w-3" /> read receipts on
            </span>
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto bg-white p-5" data-testid="message-list">
          {activeThread.messages.map((message) => (
            <div
              key={message.id}
              className={`max-w-[82%] border p-4 ${
                message.from === 'me'
                  ? 'ml-auto border-[#0022FF] bg-[#0022FF] text-white'
                  : 'border-black/10 bg-[#F5F5F5]'
              }`}
              data-testid={`message-${message.id}`}
            >
              <p className="text-sm leading-6" data-testid={`message-text-${message.id}`}>
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
          ))}
        </div>

        <div className="border-t border-black/10 p-4" data-testid="composer-panel">
          <div className="mb-3 grid grid-cols-2 gap-2 xl:grid-cols-4" data-testid="quick-action-row">
            {quickActions.map((action) => (
              <Button
                key={action.id}
                variant="outline"
                onClick={() => setModalAction(action)}
                className="h-auto min-h-11 whitespace-normal rounded-none border-black/20 px-3 py-3 text-center text-xs leading-tight hover:bg-black hover:text-white sm:text-sm"
                data-testid={`quick-action-${action.id}`}
              >
                <span className="block break-words" data-testid={`quick-action-label-${action.id}`}>
                  {action.title}
                </span>
              </Button>
            ))}
          </div>
          <div className="flex items-stretch gap-2">
            <Input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Write encrypted message..."
              className="h-12 min-w-0 rounded-none border-black/20 text-sm"
              data-testid="message-composer-input"
            />
            <Button
              onClick={sendMessage}
              className="h-12 shrink-0 rounded-none bg-[#0022FF] px-4 hover:bg-[#0019CC]"
              data-testid="message-send-button"
              aria-label="Send encrypted message"
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
      </div>

      <aside
        className="border-t border-black/10 bg-[#F5F5F5] p-4 lg:border-l lg:border-t-0"
        data-testid="agent-panel"
      >
        <div className="mb-5 border border-black/10 bg-white p-4" data-testid="agent-card">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#52525B]" data-testid="agent-card-kicker">
            MCP control room
          </p>
          <h3 className="mt-2 font-heading text-xl font-black tracking-tight" data-testid="agent-name">
            Authorized agents
          </h3>
          <p className="mt-2 text-sm leading-5 text-[#52525B]" data-testid="agent-explanation">
            Claude runs outside Ori. This panel only shows policy, allowed tools, and action logs.
          </p>
          {authorizedAgents.map((agent) => (
            <div
              key={agent.id}
              className="mt-4 border border-black/10 p-3"
              data-testid={`authorized-agent-${agent.id}`}
            >
              <p className="font-heading text-base font-bold" data-testid={`authorized-agent-name-${agent.id}`}>
                {agent.name}
              </p>
              <p className="font-mono text-xs text-[#52525B]" data-testid={`authorized-agent-address-${agent.id}`}>
                {agent.address}
              </p>
              <p className="mt-2 font-mono text-xs text-[#0022FF]" data-testid={`authorized-agent-cap-${agent.id}`}>
                {agent.cap}
              </p>
            </div>
          ))}
        </div>
        <Tabs defaultValue="actions" data-testid="inbox-agent-tabs">
          <TabsList className="grid h-auto grid-cols-2 rounded-none bg-white p-0" data-testid="agent-tabs-list">
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
            {agentActions.map((item) => (
              <div
                key={item.id}
                className="border border-black/10 bg-white p-4"
                data-testid={`agent-action-${item.id}`}
              >
                <p className="font-mono text-xs text-[#0022FF]" data-testid={`agent-action-name-${item.id}`}>
                  {item.action}
                </p>
                <p className="mt-2 text-sm font-semibold" data-testid={`agent-action-detail-${item.id}`}>
                  {item.detail}
                </p>
                <p className="mt-2 font-mono text-xs text-[#52525B]" data-testid={`agent-action-actor-${item.id}`}>
                  {item.actor}
                </p>
                <p className="mt-2 font-mono text-xs text-[#52525B]" data-testid={`agent-action-cap-${item.id}`}>
                  {item.cap}
                </p>
              </div>
            ))}
          </TabsContent>
          <TabsContent value="tools" className="mt-4 grid grid-cols-1 gap-3" data-testid="mcp-tools-content">
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
          </TabsContent>
        </Tabs>
      </aside>
      <ActionDialog action={modalAction} onClose={() => setModalAction(null)} onComplete={setRecentAction} />
    </section>
  )
}
