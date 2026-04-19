'use client'

/**
 * BillSplitModal — compose a "you owe $X" structured message in a 1-on-1 chat.
 *
 * Semantics:
 *   - sender enters a total + number of people
 *   - per-person share = total / N (rounded to 2 decimals on the display side)
 *   - an encrypted bill-split message is sent to the counterparty with the
 *     total, share, participants, and memo
 *   - recipient sees a card explaining the bill + a Pay Share button that
 *     fires `payment_router::send` for their share
 *
 * For splits across many wallets at once, /send/bulk uses `batch_send` directly.
 */
import { useState, useMemo } from 'react'
import { Loader2, Split, X, Users, Minus, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useInterwovenKit } from '@initia/interwovenkit-react'

import { ORI_DENOM, ORI_DECIMALS, ORI_SYMBOL } from '@/lib/chain-config'
import { encodeStructured, makeNonce } from '@/lib/message-kinds'
import { sealedBoxEncrypt, toBase64, utf8Encode, randomBytes } from '@/lib/crypto'
import { postMessage } from '@/lib/api'
import { getRecipientEncryptionPubkey } from '@/lib/api-profile'
import type { Keypair } from '@/lib/keystore'

type Props = {
  open: boolean
  onClose: () => void
  chatId: string
  recipientAddress: string
  recipientInitName: string | null
  keypair: Keypair | null
  onSent: (args: {
    id: string
    totalAmount: bigint
    participants: number
    perShare: bigint
    memo: string
    createdAtMs: number
  }) => void
}

export function BillSplitModal({
  open,
  onClose,
  chatId,
  recipientAddress,
  recipientInitName,
  keypair,
  onSent,
}: Props) {
  const { initiaAddress } = useInterwovenKit()
  const [total, setTotal] = useState('')
  const [participants, setParticipants] = useState(2)
  const [memo, setMemo] = useState('')
  const [busy, setBusy] = useState(false)

  const perPerson = useMemo(() => {
    const n = Number(total)
    if (!Number.isFinite(n) || n <= 0 || participants < 2) return ''
    const raw = n / participants
    return raw.toFixed(ORI_DECIMALS === 6 ? 6 : 2).replace(/0+$/, '').replace(/\.$/, '')
  }, [total, participants])

  if (!open) return null

  const handleSend = async () => {
    if (!initiaAddress || !keypair) {
      toast.error('Not ready')
      return
    }
    const totalBase = toBaseUnits(total)
    if (totalBase <= 0n) {
      toast.error('Enter a bill total')
      return
    }
    if (participants < 2) {
      toast.error('Split needs at least 2 people')
      return
    }
    const perShareBase = totalBase / BigInt(participants)
    if (perShareBase <= 0n) {
      toast.error('Per-person share is too small')
      return
    }

    setBusy(true)
    try {
      const recipientPubkey = await getRecipientEncryptionPubkey(recipientAddress)
      if (!recipientPubkey) {
        toast.error(`${recipientInitName ?? 'Recipient'} hasn't set up encryption yet`)
        return
      }
      const nonce = makeNonce()
      const payload = encodeStructured({
        kind: 'split_bill',
        totalAmount: totalBase.toString(),
        denom: ORI_DENOM,
        participants: [initiaAddress, recipientAddress],
        memo: memo.trim(),
        nonce,
      })
      const plaintext = utf8Encode(payload)
      const [ciphertext, senderCiphertext] = await Promise.all([
        sealedBoxEncrypt(plaintext, recipientPubkey),
        sealedBoxEncrypt(plaintext, keypair.publicKey),
      ])
      const envSig = await randomBytes(16)

      const res = await postMessage({
        chatId,
        recipientInitiaAddress: recipientAddress,
        ciphertextBase64: toBase64(ciphertext),
        senderCiphertextBase64: toBase64(senderCiphertext),
        senderSignatureBase64: toBase64(envSig),
      })

      onSent({
        id: res.id,
        totalAmount: totalBase,
        participants,
        perShare: perShareBase,
        memo: memo.trim(),
        createdAtMs: new Date(res.createdAt).getTime(),
      })
      toast.success('Bill split sent')
      onClose()
      setTotal('')
      setMemo('')
      setParticipants(2)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to send')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Split bill"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-3xl bg-muted border border-border p-5"
      >
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-2">
            <Split className="w-5 h-5 text-accent" />
            <h2 className="text-base font-semibold">Split a bill</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full inline-flex items-center justify-center hover:bg-border"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Splits the bill equally. {recipientInitName ?? 'They'} will see their share and a 1-tap Pay button.
        </p>

        <label className="block mt-4">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">Total</span>
          <div className="mt-1 flex items-center gap-2">
            <input
              inputMode="decimal"
              placeholder="0.00"
              value={total}
              onChange={(e) => setTotal(e.target.value)}
              className="flex-1 rounded-xl bg-background border border-border px-3 py-3 text-xl font-semibold focus:outline-none focus:border-primary"
            />
            <span className="text-sm text-muted-foreground">{ORI_SYMBOL}</span>
          </div>
        </label>

        <label className="block mt-3">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">People</span>
          <div className="mt-1 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setParticipants((n) => Math.max(2, n - 1))}
              className="w-10 h-10 rounded-xl bg-background border border-border inline-flex items-center justify-center"
              aria-label="Fewer"
            >
              <Minus className="w-4 h-4" />
            </button>
            <div className="flex-1 rounded-xl bg-background border border-border px-3 py-3 text-center inline-flex items-center justify-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-xl font-bold">{participants}</span>
            </div>
            <button
              type="button"
              onClick={() => setParticipants((n) => Math.min(50, n + 1))}
              className="w-10 h-10 rounded-xl bg-background border border-border inline-flex items-center justify-center"
              aria-label="More"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </label>

        <label className="block mt-3">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">Memo</span>
          <input
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            maxLength={120}
            placeholder="Dinner at Fred's"
            className="mt-1 w-full rounded-xl bg-background border border-border px-3 py-3 focus:outline-none focus:border-primary"
          />
        </label>

        <div className="mt-4 rounded-2xl border border-accent/30 bg-accent/5 p-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Each pays</span>
            <span className="text-lg font-bold">
              {perPerson || '—'} <span className="text-xs">{ORI_SYMBOL}</span>
            </span>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl py-3 bg-background border border-border text-sm"
          >
            Cancel
          </button>
          <button
            onClick={() => void handleSend()}
            disabled={busy || !perPerson}
            className="flex-1 rounded-xl py-3 bg-accent text-background text-sm font-medium disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            {busy ? 'Sending…' : 'Send split'}
          </button>
        </div>
      </div>
    </div>
  )
}

function toBaseUnits(human: string, decimals = ORI_DECIMALS): bigint {
  if (!human) return 0n
  const [whole, fracRaw = ''] = human.split('.') as [string, string?]
  const frac = (fracRaw + '0'.repeat(decimals)).slice(0, decimals)
  return BigInt(whole || '0') * 10n ** BigInt(decimals) + BigInt(frac || '0')
}
