'use client'

/**
 * /send — single-screen payment composer.
 *
 * Recipient + amount + optional memo. Resolves .init names automatically
 * via the `useResolve` hook; once resolved, the green confirm strip
 * unlocks the Send button. Auto-sign + InterwovenKit handle the on-chain
 * tx itself; we just compose `msgSendPayment` and hand it off.
 */
import * as React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useInterwovenKit } from '@initia/interwovenkit-react'
import { toast } from 'sonner'
import { ArrowRight, CheckCircle2 } from 'lucide-react'

import { AppShell } from '@/components/layout/app-shell'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useResolve } from '@/hooks/use-resolve'
import { useAutoSign } from '@/hooks/use-auto-sign'
import {
  ORI_CHAIN_ID,
  ORI_DECIMALS,
  ORI_DENOM,
  ORI_SYMBOL,
} from '@/lib/chain-config'
import { msgSendPayment } from '@/lib/contracts'
import { deriveChatId } from '@/lib/crypto'
import { buildAutoSignFee, sendTx } from '@/lib/tx'

export default function SendPage() {
  const router = useRouter()
  const params = useSearchParams()
  const kit = useInterwovenKit()
  const { initiaAddress, isConnected, openConnect } = kit
  const { isEnabled: autoSign } = useAutoSign()

  const [to, setTo] = React.useState(params.get('to') ?? '')
  const [amount, setAmount] = React.useState(params.get('amount') ?? '')
  const [memo, setMemo] = React.useState(params.get('memo') ?? '')
  const [busy, setBusy] = React.useState(false)

  const { data: resolved, isFetching: resolving } = useResolve(to || null)

  const baseUnits = React.useMemo(() => {
    return parseAmountToBase(amount, ORI_DECIMALS)
  }, [amount])

  const canSend = Boolean(
    isConnected && initiaAddress && resolved?.initiaAddress && baseUnits > 0n,
  )

  const handleSend = async () => {
    if (!isConnected) {
      void openConnect()
      return
    }
    if (!initiaAddress || !resolved?.initiaAddress) {
      toast.error('Recipient not resolved')
      return
    }
    if (baseUnits <= 0n) {
      toast.error('Enter an amount')
      return
    }
    setBusy(true)
    try {
      const chatId = await deriveChatId(initiaAddress, resolved.initiaAddress)
      const msg = msgSendPayment({
        sender: initiaAddress,
        recipient: resolved.initiaAddress,
        amount: baseUnits,
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
      toast.success(`Sent ${amount} ${ORI_SYMBOL} to ${displayName(resolved)}`)
      router.push(
        `/chat/${encodeURIComponent(resolved.initName ?? resolved.initiaAddress)}`,
      )
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Send failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AppShell>
      <PageHeader
        title="Send"
        sub="Pick a name, set an amount. Both sides see the payment card the moment it lands."
      />

      <Card className="mt-10">
        <CardContent className="p-8">
          {/* Recipient */}
          <div className="space-y-2">
            <Label htmlFor="send-to">To</Label>
            <Input
              id="send-to"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="alice.init or init1…"
              className="font-mono"
              autoComplete="off"
              autoCapitalize="off"
            />
          </div>

          {/* Resolution status */}
          <div className="mt-2 min-h-[20px] text-[12.5px]">
            {resolving && <span className="text-ink-3">Resolving…</span>}
            {!resolving && resolved && (
              <span className="text-[#058A4D] inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {displayName(resolved)} ·{' '}
                <span className="font-mono">
                  {resolved.initiaAddress.slice(0, 12)}…
                </span>
              </span>
            )}
            {!resolving && to && !resolved && (
              <span className="text-[#B91C1C]">
                Could not resolve — check the .init name or address.
              </span>
            )}
          </div>

          {/* Amount — large numeric input */}
          <div className="mt-6">
            <label className="block text-[13px] font-medium text-ink-2 mb-2">
              Amount
            </label>
            <div className="rounded-2xl bg-white/60 border border-black/5 px-6 py-7 text-center">
              <div className="font-mono tnum text-ink leading-none flex items-baseline justify-center gap-2">
                <span className="text-ink-3 text-[24px]">$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(sanitize(e.target.value))}
                  placeholder="0"
                  className="bg-transparent outline-none placeholder:text-ink-4 text-center font-mono w-full max-w-[280px]"
                  style={{ fontSize: 'clamp(40px, 8vw, 56px)', fontWeight: 500 }}
                />
              </div>
              <div className="mt-2 text-[12px] font-mono text-ink-3 uppercase tracking-[0.1em]">
                {ORI_SYMBOL}
              </div>
            </div>
            {/* Quick amount chips */}
            <div className="mt-3 flex flex-wrap gap-2">
              {['1', '5', '10', '25'].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setAmount(v)}
                  className="rounded-full px-3.5 h-8 bg-white/60 border border-black/5 hover:bg-white/80 active:scale-95 transition text-[12.5px] font-medium text-ink-2 hover:text-ink"
                >
                  {v} {ORI_SYMBOL}
                </button>
              ))}
            </div>
          </div>

          {/* Optional memo */}
          <div className="mt-6 space-y-2">
            <Label htmlFor="send-memo">Memo (optional)</Label>
            <Input
              id="send-memo"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="thanks for the coffee"
              maxLength={120}
            />
          </div>

          {/* Send */}
          <div className="mt-8">
            <Button
              size="lg"
              className="w-full"
              disabled={!canSend || busy}
              onClick={handleSend}
            >
              {canSend && amount
                ? `Send ${amount} ${ORI_SYMBOL}`
                : 'Send'}
              <ArrowRight className="w-4 h-4" />
            </Button>
            <p className="mt-3 text-[12px] text-ink-3 text-center">
              {autoSign ? (
                <>Auto-sign on — no popup.</>
              ) : (
                <>Wallet will ask once.</>
              )}
            </p>
          </div>
        </CardContent>
      </Card>
    </AppShell>
  )
}

function displayName(r: { initName?: string | null; initiaAddress: string }): string {
  return r.initName ?? `${r.initiaAddress.slice(0, 8)}…${r.initiaAddress.slice(-4)}`
}

/** Strip non-numeric, allow one decimal point, cap to 6 places. */
function sanitize(raw: string): string {
  const cleaned = raw.replace(/[^0-9.]/g, '')
  const parts = cleaned.split('.')
  if (parts.length <= 1) return cleaned
  return parts[0] + '.' + parts.slice(1).join('').slice(0, 6)
}

/** "1.5" + 6 decimals → 1500000n. */
function parseAmountToBase(s: string, decimals: number): bigint {
  if (!s) return 0n
  const [whole, fracRaw = ''] = s.split('.')
  const frac = (fracRaw + '0'.repeat(decimals)).slice(0, decimals)
  const wholeBig = BigInt(whole || '0')
  const fracBig = BigInt(frac || '0')
  return wholeBig * 10n ** BigInt(decimals) + fracBig
}
