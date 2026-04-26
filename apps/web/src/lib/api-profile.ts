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

/**
 * Lookup result:
 *   - bytes : recipient has published a key — go ahead and encrypt
 *   - null  : recipient hasn't set one yet (deterministic 404 /
 *             PUBKEY_NOT_SET). Retrying won't help; UI should tell the
 *             sender to ask the recipient to enable encryption.
 *   - throws: backend / network failure. Retrying may help.
 *
 * The deterministic-vs-transient split matters because the UI used to
 * collapse both into a generic 'send failed' toast.
 */
export async function getRecipientEncryptionPubkey(
  initiaAddress: string,
): Promise<Uint8Array | null> {
  try {
    const res = await req<{ pubkeyBase64: string }>(
      `/v1/profiles/${encodeURIComponent(initiaAddress)}/encryption-pubkey`,
    )
    return fromBase64(res.pubkeyBase64)
  } catch (e) {
    if (e instanceof ApiError) {
      if (e.status === 404 || e.code === 'PUBKEY_NOT_SET') return null
    }
    throw e
  }
}
