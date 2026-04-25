import { API_URL } from './chain-config'

export type ActivityEntry =
  | {
      kind: 'tip'
      id: string
      direction: 'given' | 'received'
      counterparty: string
      amount: string
      denom: string
      message: string
      at: string
    }
  | {
      kind: 'payment'
      id: string
      direction: 'sent' | 'received'
      counterparty: string
      amount: string
      denom: string
      memo: string
      at: string
    }
  | {
      kind: 'follow'
      id: string
      direction: 'started_following' | 'new_follower'
      counterparty: string
      at: string
    }

export type ActivityPage = {
  address: string
  entries: ActivityEntry[]
  nextCursor: string | null
}

export async function fetchActivity(
  address: string,
  opts: { cursor?: string; limit?: number } = {},
): Promise<ActivityPage> {
  const qs = new URLSearchParams()
  if (opts.cursor) qs.set('cursor', opts.cursor)
  if (opts.limit) qs.set('limit', String(opts.limit))
  const suffix = qs.toString() ? `?${qs}` : ''
  const res = await fetch(
    `${API_URL}/v1/profiles/${encodeURIComponent(address)}/activity${suffix}`,
  )
  if (!res.ok) throw new Error(`activity failed: ${res.status}`)
  return (await res.json()) as ActivityPage
}

export type WeeklyStats = {
  address: string
  windowDays: number
  since: string
  agentSpend: { totalBaseUnits: string; txCount: number }
  tipsGiven: { totalBaseUnits: string; count: number }
  tipsReceived: { totalBaseUnits: string; count: number }
  paymentsInCount: number
  topCreator: { address: string; displayName: string } | null
  predictionResults: { wins: number; losses: number; pendingMarkets: number }
}

export async function fetchWeeklyStats(address: string): Promise<WeeklyStats> {
  const res = await fetch(
    `${API_URL}/v1/profiles/${encodeURIComponent(address)}/weekly-stats`,
  )
  if (!res.ok) throw new Error(`weekly-stats failed: ${res.status}`)
  return (await res.json()) as WeeklyStats
}
