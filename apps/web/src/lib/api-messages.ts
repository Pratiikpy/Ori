/**
 * Message client wrappers — lists + send + read receipts.
 *
 * Backend never decrypts; we ship sealed blobs only. Decryption + sealing
 * lives in lib/crypto.ts.
 */
import { API_URL } from './chain-config'
import { ApiError, getSessionToken } from './api'

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

export type MessageRow = {
  id: string
  chatId: string
  senderId: string
  recipientId: string
  senderInitiaAddress: string
  recipientInitiaAddress: string
  ciphertextBase64: string
  senderCiphertextBase64: string | null
  senderSignatureBase64: string
  createdAt: string
  deliveredAt: string | null
  readAt: string | null
}

export async function fetchMessages(
  chatId: string,
  opts: { before?: string; limit?: number } = {},
): Promise<{ messages: MessageRow[] }> {
  const qs = new URLSearchParams()
  if (opts.before) qs.set('before', opts.before)
  if (opts.limit) qs.set('limit', String(opts.limit))
  const suffix = qs.toString() ? `?${qs}` : ''
  return req(`/v1/messages/${encodeURIComponent(chatId)}${suffix}`)
}

export type SendMessageInput = {
  chatId: string
  recipientInitiaAddress: string
  ciphertextBase64: string
  senderCiphertextBase64?: string
  senderSignatureBase64: string
  expiresInHours?: number
}

export async function postMessage(
  body: SendMessageInput,
): Promise<{ id: string; chatId: string; createdAt: string }> {
  return req('/v1/messages', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function markMessageRead(messageId: string): Promise<void> {
  await req(`/v1/messages/${encodeURIComponent(messageId)}/read`, {
    method: 'POST',
  })
}
