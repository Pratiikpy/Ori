import { API_URL } from './chain-config'
import { ApiError, getSessionToken } from './api'

export async function fetchPresence(addresses: string[]): Promise<Set<string>> {
  if (addresses.length === 0) return new Set()
  const token = getSessionToken()
  if (!token) return new Set()
  const res = await fetch(`${API_URL}/v1/presence`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ addresses }),
  })
  if (!res.ok) {
    throw new ApiError(res.status, 'PRESENCE_FETCH_FAILED', res.statusText)
  }
  const body = (await res.json()) as { online: string[] }
  return new Set(body.online)
}
