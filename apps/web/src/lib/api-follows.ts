import { API_URL } from './chain-config'

export type FollowStats = {
  address: string
  followersCount: number
  followingCount: number
}

export async function fetchFollowStats(address: string): Promise<FollowStats> {
  const res = await fetch(
    `${API_URL}/v1/profiles/${encodeURIComponent(address)}/follow-stats`,
  )
  if (!res.ok) throw new Error(`follow-stats failed: ${res.status}`)
  return (await res.json()) as FollowStats
}

export type FollowEntry = {
  address: string
  initName: string | null
  avatarUrl: string
  bio: string
  at: string
}

async function followsList(
  address: string,
  side: 'followers' | 'following',
  limit: number,
): Promise<FollowEntry[]> {
  const res = await fetch(
    `${API_URL}/v1/profiles/${encodeURIComponent(address)}/${side}?limit=${limit}`,
  )
  if (!res.ok) throw new Error(`${side} failed: ${res.status}`)
  const body = (await res.json()) as { entries: FollowEntry[] }
  return body.entries ?? []
}

export const fetchFollowers = (address: string, limit = 50) =>
  followsList(address, 'followers', limit)
export const fetchFollowing = (address: string, limit = 50) =>
  followsList(address, 'following', limit)
