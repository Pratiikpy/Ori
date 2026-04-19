'use client'

import { useState } from 'react'
import { useInterwovenKit } from '@initia/interwovenkit-react'
import { Send, DollarSign, Gift, Lock, Loader2, Scale, HandCoins, Split } from 'lucide-react'
import { toast } from 'sonner'

import { ORI_CHAIN_ID, ORI_DENOM, ORI_DECIMALS } from '@/lib/chain-config'
import { msgSendPayment } from '@/lib/contracts'
import { sealedBoxEncrypt, toBase64, utf8Encode, randomBytes } from '@/lib/crypto'
import { postMessage } from '@/lib/api'
import { getRecipientEncryptionPubkey } from '@/lib/api-profile'
import type { Keypair } from '@/lib/keystore'
import { useAutoSign } from '@/hooks/use-auto-sign'
import { buildAutoSignFee, sendTx } from '@/lib/tx'
import { encodeStructured, makeNonce } from '@/lib/message-kinds'
import { parseIntent } from '@/lib/intent-parser'

type Props = {
  chatId: string
  recipientAddress: string
  recipientInitName: string | null
  keypair: Keypair | null
  onLocalMessage: (msg: {
    id: string
    plaintext: string
    createdAtMs: number
    direction: 'sent'
  }) => void
  onPayment: (args: {
    amount: bigint
    memo: string
    txHash: string
    recipient: string
    timestampMs: number
  }) => void
  onRequest: (args: {
    id: string
    amount: bigint
    memo: string
    nonce: string
    createdAtMs: number
  }) => void
  onOpenWager: () => void
  onOpenSplit: () => void
  onRequestUnlock: () => void
}

export function ChatComposer({
  chatId,
  recipientAddress,
  recipientInitName,
  keypair,
  onLocalMessage,
  onPayment,
  onRequest,
  onOpenWager,
  onOpenSplit,
  onRequestUnlock,
}: Props) {
  const kit = useInterwovenKit()
  const { initiaAddress } = kit
  const { isEnabled: autoSignEnabled } = useAutoSign()

  const [text, setText] = useState('')
  const [showPay, setShowPay] = useState(false)
  const [payMode, setPayMode] = useState<'pay' | 'request'>('pay')
  const [payAmount, setPayAmount] = useState('')
  const [sending, setSending] = useState(false)
  const [paying, setPaying] = useState(false)
  const [requesting, setRequesting] = useState(false)

  const handleSend = async () => {
    const msg = text.trim()
    if (!msg || !keypair || !initiaAddress) return

    // Intent parser: slash-commands route to structured actions instead of text.
    const intent = parseIntent(msg)
    if (intent) {
      if (intent.kind === 'pay') {
        setPayMode('pay')
        setPayAmount(intent.amount)
        setText(intent.memo)
        setShowPay(true)
        return
      }
      if (intent.kind === 'request') {
        setPayMode('request')
        setPayAmount(intent.amount)
        setText(intent.memo)
        setShowPay(true)
        return
      }
      if (intent.kind === 'tip') {
        // Route to pay mode with memo — creator tip is equivalent in a chat.
        setPayMode('pay')
        setPayAmount(intent.amount)
        setText(intent.message || 'tip')
        setShowPay(true)
        return
      }
      if (intent.kind === 'split') {
        toast.info('Use the Split button — intent: ' + JSON.stringify(intent))
        return
      }
      if (intent.kind === 'gift') {
        window.open(
          `/gift/new?to=${encodeURIComponent(recipientAddress)}&amount=${encodeURIComponent(intent.amount)}&message=${encodeURIComponent(intent.message)}`,
          '_self',
        )
        return
      }
    }

    setSending(true)
    try {
      const recipientPubkey = await getRecipientEncryptionPubkey(recipientAddress)
      if (!recipientPubkey) {
        toast.error(`${recipientInitName ?? 'Recipient'} hasn't set up encryption yet`)
        return
      }

      const plaintext = utf8Encode(msg)
      const [ciphertext, senderCiphertext] = await Promise.all([
        sealedBoxEncrypt(plaintext, recipientPubkey),
        sealedBoxEncrypt(plaintext, keypair.publicKey),
      ])
      const nonce = await randomBytes(16)

      const res = await postMessage({
        chatId,
        recipientInitiaAddress: recipientAddress,
        ciphertextBase64: toBase64(ciphertext),
        senderCiphertextBase64: toBase64(senderCiphertext),
        senderSignatureBase64: toBase64(nonce),
      })

      onLocalMessage({
        id: res.id,
        plaintext: msg,
        createdAtMs: new Date(res.createdAt).getTime(),
        direction: 'sent',
      })
      setText('')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Send failed')
    } finally {
      setSending(false)
    }
  }

  const handlePay = async () => {
    if (!initiaAddress || !recipientAddress) return
    const decimal = Number(payAmount)
    if (!Number.isFinite(decimal) || decimal <= 0) {
      toast.error('Enter a valid amount')
      return
    }
    const amount = toBaseUnits(payAmount)

    setPaying(true)
    try {
      const message = msgSendPayment({
        sender: initiaAddress,
        recipient: recipientAddress,
        amount,
        memo: text.trim(),
        chatId,
        denom: ORI_DENOM,
      })

      const tx = await sendTx(kit, {
        chainId: ORI_CHAIN_ID,
        messages: [message],
        autoSign: autoSignEnabled,
        fee: autoSignEnabled ? buildAutoSignFee(500_000) : undefined,
      })

      onPayment({
        amount,
        memo: text.trim(),
        txHash: tx.txHash,
        recipient: recipientAddress,
        timestampMs: Date.now(),
      })

      toast.success(
        `Paid ${payAmount} ${ORI_DENOM.startsWith('u') ? ORI_DENOM.slice(1).toUpperCase() : ''}`,
      )
      setText('')
      setPayAmount('')
      setShowPay(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Payment failed')
    } finally {
      setPaying(false)
    }
  }

  const handleRequest = async () => {
    if (!initiaAddress || !recipientAddress || !keypair) return
    const decimal = Number(payAmount)
    if (!Number.isFinite(decimal) || decimal <= 0) {
      toast.error('Enter a valid amount')
      return
    }
    const amount = toBaseUnits(payAmount)
    const memo = text.trim()
    const nonce = makeNonce()

    setRequesting(true)
    try {
      const recipientPubkey = await getRecipientEncryptionPubkey(recipientAddress)
      if (!recipientPubkey) {
        toast.error(`${recipientInitName ?? 'Recipient'} hasn't set up encryption yet`)
        return
      }

      const payload = encodeStructured({
        kind: 'payment_request',
        amount: amount.toString(),
        denom: ORI_DENOM,
        memo,
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

      onRequest({
        id: res.id,
        amount,
        memo,
        nonce,
        createdAtMs: new Date(res.createdAt).getTime(),
      })

      toast.success(
        `Requested ${payAmount} ${ORI_DENOM.startsWith('u') ? ORI_DENOM.slice(1).toUpperCase() : ''}`,
      )
      setText('')
      setPayAmount('')
      setShowPay(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setRequesting(false)
    }
  }

  if (!keypair) {
    return (
      <div className="border-t border-border p-3 safe-area-bottom">
        <button
          onClick={onRequestUnlock}
          className="w-full rounded-2xl py-3 bg-muted border border-border text-sm font-medium inline-flex items-center justify-center gap-2"
        >
          <Lock className="w-4 h-4" />
          Unlock encryption to chat
        </button>
      </div>
    )
  }

  return (
    <div className="border-t border-border safe-area-bottom">
      {showPay && (
        <div className="px-3 pt-3">
          <div
            className={
              'rounded-2xl border p-3 ' +
              (payMode === 'pay'
                ? 'border-primary/40 bg-primary/10'
                : 'border-warning/40 bg-warning/10')
            }
          >
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-2">
                {payMode === 'pay' ? (
                  <DollarSign className="w-4 h-4 text-primary" />
                ) : (
                  <HandCoins className="w-4 h-4 text-warning" />
                )}
                <span className="text-sm font-medium">
                  {payMode === 'pay'
                    ? `Pay ${recipientInitName ?? 'recipient'}`
                    : `Request from ${recipientInitName ?? 'recipient'}`}
                </span>
              </div>
              <div className="inline-flex rounded-lg bg-background/60 p-0.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => setPayMode('pay')}
                  className={
                    'px-2 py-1 rounded-md transition ' +
                    (payMode === 'pay' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')
                  }
                >
                  Pay
                </button>
                <button
                  type="button"
                  onClick={() => setPayMode('request')}
                  className={
                    'px-2 py-1 rounded-md transition ' +
                    (payMode === 'request' ? 'bg-warning text-warning-foreground' : 'text-muted-foreground')
                  }
                >
                  Request
                </button>
              </div>
            </div>

            <div className="mt-2 flex items-center gap-2">
              <input
                inputMode="decimal"
                placeholder="0"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                className="flex-1 rounded-xl bg-background/60 border border-border px-3 py-2 text-xl font-semibold focus:outline-none focus:border-primary"
              />
              <span className="text-sm text-muted-foreground">
                {ORI_DENOM.startsWith('u') ? ORI_DENOM.slice(1).toUpperCase() : ORI_DENOM}
              </span>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              {payMode === 'pay'
                ? autoSignEnabled
                  ? 'Zero popup — 1-tap send.'
                  : 'One-time approval will appear.'
                : `A tap-to-pay card will appear in ${recipientInitName ?? 'their'} chat.`}
            </div>
            <div className="mt-2 flex gap-2">
              <button
                onClick={() => setShowPay(false)}
                className="flex-1 rounded-xl py-2 bg-muted text-sm"
              >
                Cancel
              </button>
              {payMode === 'pay' ? (
                <button
                  onClick={handlePay}
                  disabled={paying}
                  className="flex-1 rounded-xl py-2 bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 inline-flex items-center justify-center gap-2"
                >
                  {paying && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {paying ? 'Sending…' : 'Send'}
                </button>
              ) : (
                <button
                  onClick={handleRequest}
                  disabled={requesting}
                  className="flex-1 rounded-xl py-2 bg-warning text-warning-foreground text-sm font-medium disabled:opacity-50 inline-flex items-center justify-center gap-2"
                >
                  {requesting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {requesting ? 'Sending…' : 'Request'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex items-end gap-2 p-3">
        <button
          type="button"
          onClick={() => setShowPay((v) => !v)}
          aria-label="Pay"
          className={
            'w-10 h-10 rounded-full flex-none inline-flex items-center justify-center transition ' +
            (showPay
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted border border-border text-muted-foreground hover:text-foreground')
          }
        >
          <DollarSign className="w-5 h-5" />
        </button>
        <button
          type="button"
          aria-label="Send gift"
          onClick={() =>
            window.open(`/gift/new?to=${encodeURIComponent(recipientAddress)}`, '_self')
          }
          className="w-10 h-10 rounded-full flex-none inline-flex items-center justify-center bg-muted border border-border text-muted-foreground hover:text-foreground"
        >
          <Gift className="w-5 h-5" />
        </button>
        <button
          type="button"
          aria-label="Propose wager"
          onClick={onOpenWager}
          className="w-10 h-10 rounded-full flex-none inline-flex items-center justify-center bg-muted border border-border text-muted-foreground hover:text-foreground"
        >
          <Scale className="w-5 h-5" />
        </button>
        <button
          type="button"
          aria-label="Split bill"
          onClick={onOpenSplit}
          className="w-10 h-10 rounded-full flex-none inline-flex items-center justify-center bg-muted border border-border text-muted-foreground hover:text-foreground"
        >
          <Split className="w-5 h-5" />
        </button>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              void handleSend()
            }
          }}
          placeholder="Message"
          rows={1}
          className="flex-1 max-h-32 resize-none rounded-2xl bg-muted border border-border px-3 py-2 focus:outline-none focus:border-primary"
        />

        <button
          type="button"
          disabled={!text.trim() || sending}
          onClick={handleSend}
          aria-label="Send message"
          className="w-10 h-10 rounded-full flex-none bg-primary text-primary-foreground inline-flex items-center justify-center disabled:opacity-50"
        >
          {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
        </button>
      </div>
    </div>
  )
}

function toBaseUnits(human: string, decimals = ORI_DECIMALS): bigint {
  const [whole, fracRaw = ''] = human.split('.') as [string, string?]
  const frac = (fracRaw + '0'.repeat(decimals)).slice(0, decimals)
  return BigInt(whole || '0') * 10n ** BigInt(decimals) + BigInt(frac || '0')
}
