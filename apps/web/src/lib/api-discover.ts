import { API_URL } from './chain-config'

export type DiscoverEntry = {
  address: string
  initName: string | null
  bio: string
  avatarUrl: string
  lastActiveAt?: string
  paymentsSent?: number
  tipsReceived?: number
  tipsReceivedVolume?: string
  paymentsReceived24h?: number
}

async function getEntries(path: string, limit = 8): Promise<DiscoverEntry[]> {
  const res = await fetch(`${API_URL}${path}?limit=${limit}`)
  if (!res.ok) throw new Error(`${path} failed: ${res.status}`)
  const body = (await res.json()) as { entries: DiscoverEntry[] }
  return body.entries ?? []
}

export const fetchDiscoverRecent = (limit?: number) =>
  getEntries('/v1/discover/recent', limit)
export const fetchDiscoverTopCreators = (limit?: number) =>
  getEntries('/v1/discover/top-creators', limit)
export const fetchDiscoverRising = async (limit = 8): Promise<DiscoverEntry[]> => {
  const res = await fetch(`${API_URL}/v1/discover/rising?limit=${limit}`)
  if (!res.ok) throw new Error(`rising failed: ${res.status}`)
  const body = (await res.json()) as { window: string; entries: DiscoverEntry[] }
  return body.entries ?? []
}
