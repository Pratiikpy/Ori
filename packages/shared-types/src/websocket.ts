/**
 * WebSocket event payloads — the contract between Socket.IO server and client.
 *
 * Both `apps/api/src/websocket/index.ts` and `apps/web/src/lib/ws.ts` should
 * import these types so the wire format stays in sync.
 */
import { z } from 'zod'

// ========== Authentication ==========

export const WsAuthPayload = z.object({
  token: z.string().min(1),
})
export type WsAuthPayload = z.infer<typeof WsAuthPayload>

// ========== Messages ==========

export const WsMessageNewPayload = z.object({
  id: z.string(),
  chatId: z.string(),
  senderInitiaAddress: z.string(),
  recipientInitiaAddress: z.string(),
  ciphertextBase64: z.string(),
  senderSignatureBase64: z.string(),
  createdAt: z.string().datetime(),
})
export type WsMessageNewPayload = z.infer<typeof WsMessageNewPayload>

export const WsTypingPayload = z.object({
  chatId: z.string(),
  from: z.string(),
  isTyping: z.boolean(),
})
export type WsTypingPayload = z.infer<typeof WsTypingPayload>

export const WsTypingClientPayload = z.object({
  chatId: z.string(),
  recipientAddress: z.string(),
  isTyping: z.boolean(),
})
export type WsTypingClientPayload = z.infer<typeof WsTypingClientPayload>

// ========== Presence ==========

export const WsPresencePayload = z.object({
  initiaAddress: z.string(),
  status: z.enum(['online', 'offline']),
})
export type WsPresencePayload = z.infer<typeof WsPresencePayload>

// ========== On-chain event pushes (backend → client) ==========

export const WsPaymentReceivedPayload = z.object({
  chatId: z.string(),
  from: z.string(),
  to: z.string(),
  amount: z.string(),
  denom: z.string(),
  memo: z.string(),
  txHash: z.string(),
})
export type WsPaymentReceivedPayload = z.infer<typeof WsPaymentReceivedPayload>

export const WsTipReceivedPayload = z.object({
  creator: z.string(),
  tipper: z.string(),
  amount: z.string(),
  denom: z.string(),
  message: z.string(),
  txHash: z.string(),
})
export type WsTipReceivedPayload = z.infer<typeof WsTipReceivedPayload>
