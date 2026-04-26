/**
 * Authenticated client for POST /v1/profiles/encryption-pubkey — writes the
 * X25519 pubkey into the backend cache so other users' fetches don't have
 * to hit the on-chain view function. The chain remains authoritative; this
 * is a perf shortcut.
 */
import { API_URL } from './chain-config'
import { ApiError, getSessionToken } from './api'

export async function putEncryptionPubkey(pubkeyBase64: string): Promise<void> {
  const token = getSessionToken()
  if (!token) throw new ApiError(401, 'NO_SESSION', 'Not signed in')
  const res = await fetch(`${API_URL}/v1/profiles/encryption-pubkey`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ pubkeyBase64 }),
  })
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
}
