'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useInterwovenKit } from '@initia/interwovenkit-react'
import { toast } from 'sonner'
import { ArrowRight, LinkIcon, Loader2, QrCode, Users } from 'lucide-react'

import { AppShell } from '@/components/app-shell'
import { PageHeader, Serif } from '@/components/page-header'
import { BigNumberKeypad } from '@/components/big-number-keypad'
import { FirstPaymentOverlay } from '@/components/first-payment-overlay'
import { QrModal } from '@/components/qr-modal'
import { useResolve } from '@/hooks/use-resolve'
import { useAutoSign } from '@/hooks/use-auto-sign'
import { ORI_CHAIN_ID, ORI_DECIMALS, ORI_DENOM, ORI_SYMBOL } from '@/lib/chain-config'
import { msgSendPayment } from '@/lib/contracts'
import { deriveChatId } from '@/lib/crypto'
import { buildAutoSignFee, sendTx } from '@/lib/tx'

export default function SendPage() {
  const router = useRouter()
  const params = useSearchParams()
  const toParam = params.get('to') ?? ''
  const amountParam = params.get('amount') ?? ''
  const memoParam = params.get('memo') ?? ''

  const kit = useInterwovenKit()
  const { initiaAddress, isConnected, openConnect } = kit
  const { isEnabled: autoSign } = useAutoSign()

  const [to, setTo] = useState(toParam)
  const [amount, setAmount] = useState(amountParam)
  const [memo, setMemo] = useState(memoParam)
  const [busy, setBusy] = useState(false)
  const [receiveOpen, setReceiveOpen] = useState(false)

  const receiveUrl = useMemo(() => {
    if (typeof window === 'undefined' || !initiaAddress) return ''
    const base = `${window.location.origin}/send?to=${encodeURIComponent(initiaAddress)}`
    const n = Number(amount)
    const amt = Number.isFinite(n) && n > 0 ? `&amount=${encodeURIComponent(amount)}` : ''
    const m = memo ? `&memo=${encodeURIComponent(memo)}` : ''
    return `${base}${amt}${m}`
  }, [initiaAddress, amount, memo])

  const { data: resolved, isFetching: resolving } = useResolve(to || null)

  useEffect(() => {
    setTo(toParam)
  }, [toParam])

  const displayTo = useMemo(() => {
    if (!resolved) return to
    return resolved.initName ?? shortenAddress(resolved.initiaAddress)
  }, [resolved, to])

  const handleSend = async () => {
    if (!isConnected) {
      openConnect()
      return
    }
    if (!initiaAddress) return
    if (!resolved?.initiaAddress) {
      toast.error('Recipient not resolved')
      return
    }
    const base = toBaseUnits(amount, ORI_DECIMALS)
    if (base <= 0n) {
      toast.error('Enter an amount')
      return
    }

    setBusy(true)
    try {
      const chatId = await deriveChatId(initiaAddress, resolved.initiaAddress)
      const msg = msgSendPayment({
        sender: initiaAddress,
        recipient: resolved.initiaAddress,
        amount: base,
        memo,
        chatId,
        denom: ORI_DENOM,
      })
      await sendTx(kit, {
        chainId: ORI_CHAIN_ID,
        messages: [msg],
        autoSign,
        fee: autoSign ? buildAutoSignFee(500_000) : undefined,
      })
      toast.success(`Sent ${amount} ${ORI_SYMBOL} to ${displayTo}`)
      router.push(`/chat/${encodeURIComponent(resolved.initName ?? resolved.initiaAddress)}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Send failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AppShell title="Send">
      <div className="max-w-md mx-auto w-full px-5 pt-8 pb-6 space-y-6">
        <PageHeader
          kicker="04 · Create"
          title={
            <>
              <Serif>Send</Serif> {ORI_SYMBOL}.
            </>
          }
          sub="Tap an amount, pick a recipient, confirm. The money lands inside the conversation as a card both sides see at the same moment."
        />

        <div className="grid grid-cols-3 gap-2">
          <Link
            href="/send/bulk"
            className="panel-hover rounded-xl bg-white/[0.02] border border-border py-3 inline-flex items-center justify-center gap-1.5 text-xs"
          >
            <Users className="w-4 h-4" />
            Bulk
          </Link>
          <Link
            href="/gift/new"
            className="panel-hover rounded-xl bg-white/[0.02] border border-border py-3 inline-flex items-center justify-center gap-1.5 text-xs"
          >
            <LinkIcon className="w-4 h-4" />
            Via link
          </Link>
          <button
            type="button"
            onClick={() => setReceiveOpen(true)}
            disabled={!initiaAddress}
            className="rounded-xl bg-muted border border-border py-3 inline-flex items-center justify-center gap-1.5 text-xs disabled:opacity-40 hover:border-primary/50 transition"
          >
            <QrCode className="w-4 h-4" />
            Receive
          </button>
        </div>

        <label className="block">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">To</span>
          <input
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="alice.init or init1…"
            className="mt-1 w-full rounded-xl bg-muted border border-border px-3 py-3 font-mono focus:outline-none focus:border-primary"
          />
          {resolving && (
            <div className="mt-1 text-xs text-muted-foreground">Resolving…</div>
          )}
          {resolved && (
            <div className="mt-1 text-xs text-success">
              Resolved → {shortenAddress(resolved.initiaAddress)}
            </div>
          )}
          {!resolving && !resolved && to && (
            <div className="mt-1 text-xs text-danger">Could not resolve</div>
          )}
        </label>

        <div>
          <span className="text-xs uppercase tracking-wide text-muted-foreground">Amount</span>
          <div className="mt-2 rounded-2xl bg-muted/40 border border-border px-4 py-6 text-center">
            <div className="text-5xl font-bold tracking-tight tabular-nums">
              {amount || '0'}
              <span className="ml-2 text-base text-muted-foreground font-normal align-middle">
                {ORI_SYMBOL}
              </span>
            </div>
          </div>
          <BigNumberKeypad
            className="mt-3"
            value={amount}
            onChange={setAmount}
            maxDecimals={ORI_DECIMALS}
          />
        </div>

        <label className="block">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">Memo (optional)</span>
          <input
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            maxLength={140}
            className="mt-1 w-full rounded-xl bg-muted border border-border px-3 py-3 focus:outline-none focus:border-primary"
          />
        </label>

        <button
          onClick={() => void handleSend()}
          disabled={busy || !resolved}
          className="w-full rounded-2xl py-4 bg-primary text-primary-foreground font-medium disabled:opacity-50 inline-flex items-center justify-center gap-2"
        >
          {busy && <Loader2 className="w-4 h-4 animate-spin" />}
          {busy ? 'Sending…' : `Send${autoSign ? ' · 1-tap' : ''}`}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      <FirstPaymentOverlay />

      <QrModal
        open={receiveOpen && Boolean(initiaAddress)}
        onClose={() => setReceiveOpen(false)}
        title="Receive"
        subtitle={
          Number(amount) > 0
            ? `Request ${amount} ${ORI_SYMBOL}`
            : 'Anyone with a camera can scan this'
        }
        url={receiveUrl}
      />
    </AppShell>
  )
}

function toBaseUnits(human: string, decimals: number): bigint {
  if (!human) return 0n
  const [whole, fracRaw = ''] = human.split('.') as [string, string?]
  const frac = (fracRaw + '0'.repeat(decimals)).slice(0, decimals)
  return BigInt(whole || '0') * 10n ** BigInt(decimals) + BigInt(frac || '0')
}

function shortenAddress(a: string): string {
  return `${a.slice(0, 10)}…${a.slice(-4)}`
}
