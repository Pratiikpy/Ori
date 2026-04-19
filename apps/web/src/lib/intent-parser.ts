/**
 * Intent parser — turn slash-commands typed into the chat composer into
 * structured intents the composer can execute.
 *
 * Supported shapes (case-insensitive on the verb):
 *   /pay 10                     → pay counterparty 10 ORI
 *   /pay 10 for lunch           → pay 10 with memo "for lunch"
 *   /tip 5                      → tip counterparty 5 ORI
 *   /tip 5 thanks               → tip with message "thanks"
 *   /request 5                  → request 5 from counterparty
 *   /request 5 for lunch        → request with memo
 *   /split 60 4                 → split 60 ORI across 4 people → 15 each
 *   /split 60                   → split 60 between us (2 people) → 30 each
 *   /gift 5 happy birthday      → create directed gift of 5 ORI
 *
 * The parser returns `null` when the input isn't an intent; the composer
 * should fall back to sending it as a plain chat message.
 */

export type Intent =
  | { kind: 'pay'; amount: string; memo: string }
  | { kind: 'tip'; amount: string; message: string }
  | { kind: 'request'; amount: string; memo: string }
  | { kind: 'split'; totalAmount: string; people: number; memo: string }
  | { kind: 'gift'; amount: string; message: string }

const AMOUNT = /^\d+(\.\d+)?$/

export function parseIntent(raw: string): Intent | null {
  const trimmed = raw.trim()
  if (!trimmed.startsWith('/')) return null
  const firstSpace = trimmed.indexOf(' ')
  const verb = (firstSpace === -1 ? trimmed.slice(1) : trimmed.slice(1, firstSpace)).toLowerCase()
  const rest = firstSpace === -1 ? '' : trimmed.slice(firstSpace + 1).trim()

  switch (verb) {
    case 'pay': {
      const { amount, tail } = splitAmount(rest)
      if (!amount) return null
      return { kind: 'pay', amount, memo: tail }
    }
    case 'tip': {
      const { amount, tail } = splitAmount(rest)
      if (!amount) return null
      return { kind: 'tip', amount, message: tail }
    }
    case 'req':
    case 'request': {
      const { amount, tail } = splitAmount(rest)
      if (!amount) return null
      return { kind: 'request', amount, memo: tail }
    }
    case 'split': {
      const { amount, tail } = splitAmount(rest)
      if (!amount) return null
      // Next token: number of people (defaults to 2 if absent or invalid).
      const parts = tail.split(' ')
      let people = 2
      let memoStart = 0
      const firstPart = parts[0] ?? ''
      if (firstPart && /^\d+$/.test(firstPart)) {
        const n = Number(firstPart)
        if (Number.isFinite(n) && n >= 2 && n <= 50) {
          people = n
          memoStart = 1
        }
      }
      const memo = parts.slice(memoStart).join(' ').trim()
      return { kind: 'split', totalAmount: amount, people, memo }
    }
    case 'gift': {
      const { amount, tail } = splitAmount(rest)
      if (!amount) return null
      return { kind: 'gift', amount, message: tail }
    }
    default:
      return null
  }
}

function splitAmount(rest: string): { amount: string | null; tail: string } {
  const sp = rest.indexOf(' ')
  const first = sp === -1 ? rest : rest.slice(0, sp)
  const tail = sp === -1 ? '' : rest.slice(sp + 1).trim()
  // Strip optional "for" filler: "/pay 10 for lunch" → tail = "lunch"
  const filteredTail = tail.replace(/^(for|on|re|about)\s+/i, '')
  if (!AMOUNT.test(first)) return { amount: null, tail: '' }
  return { amount: first, tail: filteredTail }
}
