'use client'

import { useQuery } from '@tanstack/react-query'
import {
  fetchAgentActionsByAgent,
  fetchAgentActionsByOwner,
} from '@/lib/api-agent-actions'

export function useAgentActionsByOwner(
  ownerAddr: string | null | undefined,
  limit = 25,
) {
  return useQuery({
    queryKey: ['agent-actions', 'owner', ownerAddr, limit],
    queryFn: () => fetchAgentActionsByOwner(ownerAddr!, { limit }),
    enabled: Boolean(ownerAddr),
    staleTime: 30_000,
  })
}

export function useAgentActionsByAgent(
  agentAddr: string | null | undefined,
  limit = 25,
) {
  return useQuery({
    queryKey: ['agent-actions', 'agent', agentAddr, limit],
    queryFn: () => fetchAgentActionsByAgent(agentAddr!, { limit }),
    enabled: Boolean(agentAddr),
    staleTime: 30_000,
  })
}
