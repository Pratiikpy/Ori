/**
 * Structured chat-message payloads.
 *
 * Plain text is still plain text. To layer richer primitives (payment
 * requests, split bills, polls) without adding new schema columns, we wrap
 * structured payloads as JSON with a magic prefix:
 *
 *   "ori://msg/v1\n" + JSON.stringify(payload)
 *
 * The prefix lets the decoder distinguish structured messages from plain
 * chat text cheaply (first line check) without JSON-parsing every message.
 * Only the receiving client parses the body — server never sees plaintext.
 */

export const ORI_MSG_PREFIX = 'ori://msg/v1\n'

export type PaymentRequestBody = {
  kind: 'payment_request'
  /** u64 as string — base units (e.g. "1000000" = 1 ORI @ 6 decimals). */
  amount: string
  denom: string
  memo?: string
  /** Client nonce so identical requests have distinct IDs in the UI. */
  nonce: string
}

export type SplitBillBody = {
  kind: 'split_bill'
  /** Total amount in base units. */
  totalAmount: string
  denom: string
  participants: string[] // bech32 addresses
  memo?: string
  nonce: string
}

export type StructuredBody = PaymentRequestBody | SplitBillBody

export function encodeStructured(body: StructuredBody): string {
  return ORI_MSG_PREFIX + JSON.stringify(body)
}

export function decodeStructured(plaintext: string): StructuredBody | null {
  if (!plaintext.startsWith(ORI_MSG_PREFIX)) return null
  try {
    const body = JSON.parse(plaintext.slice(ORI_MSG_PREFIX.length)) as { kind?: string }
    if (!body || typeof body !== 'object' || typeof body.kind !== 'string') return null
    if (body.kind === 'payment_request' || body.kind === 'split_bill') {
      return body as StructuredBody
    }
    return null
  } catch {
    return null
  }
}

/** Small random nonce for client-side message IDs. */
export function makeNonce(): string {
  // 8 hex chars is plenty for de-dup within a conversation.
  const a = new Uint8Array(4)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(a)
  } else {
    for (let i = 0; i < a.length; i++) a[i] = Math.floor(Math.random() * 256)
  }
  return Array.from(a, (b) => b.toString(16).padStart(2, '0')).join('')
}
