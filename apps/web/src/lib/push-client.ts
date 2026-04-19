'use client'

import { API_URL } from './chain-config'
import { getSessionToken } from './api'

/**
 * Fetch VAPID public key, prompt for permission, register the subscription
 * with the backend. Safe to call multiple times — backend upserts by endpoint.
 */
export async function ensurePushSubscription(): Promise<PushSubscription | null> {
  if (typeof window === 'undefined') return null
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null

  const registration = await navigator.serviceWorker.ready

  let existing = await registration.pushManager.getSubscription()
  if (!existing) {
    const permission = await window.Notification.requestPermission()
    if (permission !== 'granted') return null

    const vapidRes = await fetch(`${API_URL}/v1/push/vapid-key`)
    if (!vapidRes.ok) return null
    const { publicKey } = (await vapidRes.json()) as { publicKey: string }

    // PushManager.subscribe expects a BufferSource. Cast through the buffer.
    const keyBytes = urlBase64ToUint8Array(publicKey)
    existing = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: keyBytes.buffer.slice(
        keyBytes.byteOffset,
        keyBytes.byteOffset + keyBytes.byteLength,
      ) as ArrayBuffer,
    })
  }

  // Register with backend (idempotent upsert).
  const token = getSessionToken()
  if (!token) return existing

  const json = existing.toJSON()
  const keys = (json.keys ?? {}) as { p256dh?: string; auth?: string }
  if (!json.endpoint || !keys.p256dh || !keys.auth) return existing

  await fetch(`${API_URL}/v1/push/subscribe`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      endpoint: json.endpoint,
      keys: { p256dh: keys.p256dh, auth: keys.auth },
    }),
  }).catch(() => {
    /* best-effort */
  })

  return existing
}

export async function unsubscribePush(): Promise<void> {
  if (typeof window === 'undefined') return
  if (!('serviceWorker' in navigator)) return
  const registration = await navigator.serviceWorker.ready
  const sub = await registration.pushManager.getSubscription()
  if (!sub) return
  const endpoint = sub.endpoint
  await sub.unsubscribe().catch(() => {})
  const token = getSessionToken()
  if (!token) return
  await fetch(`${API_URL}/v1/push/subscribe`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ endpoint }),
  }).catch(() => {})
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const out = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) out[i] = rawData.charCodeAt(i)
  return out
}
