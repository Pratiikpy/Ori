/**
 * Action handlers — maps each ActionDef.id to a real on-chain or API call.
 *
 * STATUS: scaffolding. Most actions surface a "queued for live wiring"
 * confirmation that includes the contract entry point, so the form
 * round-trip (open → fill → submit → toast) feels real even before each
 * msg* function is wired with the correct BCS arg encoding.
 *
 * Wired today (matching the demo script):
 *   • send-payment    → msgSendPayment
 *   • tip-creator     → msgTip
 *   • create-paywall  → (placeholder — needs msgCreatePaywall signature confirmed)
 *
 * For everything else, runAction throws an Error with the contract name,
 * which ActionDialog converts to a toast.error. That tells the user
 * exactly which Move function would be called next without lying about
 * whether the tx hit the chain.
 */
import type { ActionDef } from '@/components/ui/action-card'
import { msgSendPayment, msgTip } from '@/lib/contracts'

// Loose shape — useInterwovenKit() exposes ~20 methods (requestTxSync,
// requestTxBlock, simulateTx, etc.). We only need a couple here, but
// typing the whole bag is brittle, so we accept the full hook return
// (any) and reach for what we use.
//
// In practice the call site just passes `interwoven` straight from
// `useInterwovenKit()` and we pick the methods we need at runtime.
export type InterwovenSignerLike = {
  initiaAddress?: string | null
  username?: string | null
  requestTxSync?: (req: unknown) => Promise<{ transactionHash: string }>
  requestTxBlock?: (req: unknown) => Promise<{ transactionHash: string }>
  // Allow anything else the hook returns — we don't constrain it here.
  [key: string]: unknown
}

const INIT_DECIMALS = 6
const toBaseUnits = (initAmount: string): bigint => {
  const n = Number(initAmount)
  if (!isFinite(n) || n < 0) throw new Error(`Invalid amount: ${initAmount}`)
  return BigInt(Math.round(n * 10 ** INIT_DECIMALS))
}

const need = (values: Record<string, string>, field: string): string => {
  const v = values[field]?.trim()
  if (!v) throw new Error(`Missing required field: ${field}`)
  return v
}

const requireConnected = (signer: InterwovenSignerLike): string => {
  if (!signer.initiaAddress) {
    throw new Error('Connect your wallet first')
  }
  return signer.initiaAddress
}

export async function runAction(
  action: ActionDef,
  values: Record<string, string>,
  signer: InterwovenSignerLike,
): Promise<void> {
  const sender = requireConnected(signer)

  switch (action.id) {
    /* ====== Demo-critical: actually wired ====== */
    case 'send-payment': {
      const recipient = need(values, 'Recipient .init or address')
      const amount    = need(values, 'Amount')
      const memo      = values['Memo'] ?? ''
      const msg = msgSendPayment({
        sender,
        recipient,
        amount: toBaseUnits(amount),
        memo,
        chatId: '',
      })
      if (!signer.requestTxSync) throw new Error('Wallet not ready for tx')
      await signer.requestTxSync({ messages: [msg] })
      return
    }
    case 'tip-creator': {
      const creator = need(values, 'Creator .init')
      const amount  = need(values, 'Amount')
      const message = values['Public message'] ?? ''
      const msg = msgTip({ sender, creator, amount: toBaseUnits(amount), message })
      if (!signer.requestTxSync) throw new Error('Wallet not ready for tx')
      await signer.requestTxSync({ messages: [msg] })
      return
    }

    /* ====== API-only flows: actually wired ====== */
    case 'sponsor-status': {
      const res = await fetch('/v1/sponsor/status')
      if (!res.ok) throw new Error('Sponsor status unavailable')
      return
    }
    case 'claim-seed': {
      const addr = values['New wallet address'] || sender
      const res = await fetch('/v1/sponsor/seed', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ address: addr }),
      })
      if (!res.ok) throw new Error('Seed claim failed')
      return
    }
    case 'agent-card': {
      window.open('/.well-known/agent.json', '_blank')
      return
    }
  }

  // Default — surface contract clearly, no silent success.
  throw new Error(`${action.contract} — form captured. Live wiring queued.`)
}
