import { API_URL } from './chain-config'

export type LeaderEntry = {
  rank: number
  address: string
  initName: string | null
  avatarUrl: string
  tipsReceived?: number
  tipsReceivedVolume?: string
  tipsGiven?: number
  tipsGivenVolume?: string
}

export type ProfileTipperEntry = {
  rank: number
  address: string
  initName: string | null
  avatarUrl: string
  tipCount: number
  volume: string
}

async function listFetch<T>(path: string, limit = 10): Promise<T[]> {
  const res = await fetch(`${API_URL}${path}?limit=${limit}`)
  if (!res.ok) throw new Error(`${path} failed: ${res.status}`)
  const body = (await res.json()) as { entries: T[] }
  return body.entries ?? []
}

export const fetchTopCreators = (limit?: number) =>
  listFetch<LeaderEntry>('/v1/leaderboards/top-creators', limit)
export const fetchTopTippers = (limit?: number) =>
  listFetch<LeaderEntry>('/v1/leaderboards/top-tippers', limit)

export async function fetchProfileTopTippers(
  address: string,
  limit = 10,
): Promise<ProfileTipperEntry[]> {
  const res = await fetch(
    `${API_URL}/v1/profiles/${encodeURIComponent(address)}/top-tippers?limit=${limit}`,
  )
  if (!res.ok) throw new Error(`profile-top-tippers failed: ${res.status}`)
  const body = (await res.json()) as { entries: ProfileTipperEntry[] }
  return body.entries ?? []
}

export type GlobalStats = {
  totalUsers: number
  totalPayments: number
  totalTips: number
  totalTipVolume: string
}

export async function fetchGlobalStats(): Promise<GlobalStats> {
  const res = await fetch(`${API_URL}/v1/leaderboards/global-stats`)
  if (!res.ok) throw new Error(`global-stats failed: ${res.status}`)
  return (await res.json()) as GlobalStats
}
