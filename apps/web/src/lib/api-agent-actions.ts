import { API_URL } from './chain-config'

export type AgentActionRow = {
  id: string
  ownerAddr: string
  agentAddr: string
  toolName: string
  args: unknown
  promptHash: string | null
  txHash: string | null
  result: unknown
  status: 'pending' | 'success' | 'failed' | string
  errorMsg: string | null
  createdAt: string
  settledAt: string | null
}

export type AgentActionsPage = {
  ownerAddr?: string
  agentAddr?: string
  entries: AgentActionRow[]
  nextCursor: string | null
}

export async function fetchAgentActionsByOwner(
  ownerAddr: string,
  opts: { cursor?: string; limit?: number } = {},
): Promise<AgentActionsPage> {
  const qs = new URLSearchParams()
  if (opts.cursor) qs.set('cursor', opts.cursor)
  if (opts.limit) qs.set('limit', String(opts.limit))
  const suffix = qs.toString() ? `?${qs}` : ''
  const res = await fetch(
    `${API_URL}/v1/agent/user/${encodeURIComponent(ownerAddr)}/actions${suffix}`,
  )
  if (!res.ok) throw new Error(`agent-actions-by-owner failed: ${res.status}`)
  return (await res.json()) as AgentActionsPage
}

export async function fetchAgentActionsByAgent(
  agentAddr: string,
  opts: { cursor?: string; limit?: number } = {},
): Promise<AgentActionsPage> {
  const qs = new URLSearchParams()
  if (opts.cursor) qs.set('cursor', opts.cursor)
  if (opts.limit) qs.set('limit', String(opts.limit))
  const suffix = qs.toString() ? `?${qs}` : ''
  const res = await fetch(
    `${API_URL}/v1/agent/${encodeURIComponent(agentAddr)}/actions${suffix}`,
  )
  if (!res.ok) throw new Error(`agent-actions-by-agent failed: ${res.status}`)
  return (await res.json()) as AgentActionsPage
}
