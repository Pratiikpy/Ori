import { API_URL } from './chain-config'
import { fromBase64 } from './crypto'
import { getSessionToken, ApiError } from './api'

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers)
  if (!headers.has('Content-Type') && init?.body) {
    headers.set('Content-Type', 'application/json')
  }
  const token = getSessionToken()
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  const res = await fetch(`${API_URL}${path}`, { ...init, headers })
  if (!res.ok) {
    let code = 'UNKNOWN'
    let message = res.statusText
    try {
      const body = (await res.json()) as { error?: string; message?: string }
      code = body.error ?? code
      message = body.message ?? message
    } catch {
      /* non-JSON */
    }
    throw new ApiError(res.status, code, message)
  }
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export async function getRecipientEncryptionPubkey(
  initiaAddress: string,
): Promise<Uint8Array | null> {
  try {
    const res = await req<{ pubkeyBase64: string }>(
      `/v1/profiles/${encodeURIComponent(initiaAddress)}/encryption-pubkey`,
    )
    return fromBase64(res.pubkeyBase64)
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null
    throw e
  }
}
