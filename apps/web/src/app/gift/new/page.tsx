'use client'

import { useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useInterwovenKit } from '@initia/interwovenkit-react'
import { toast } from 'sonner'
import { Copy, Gift, Link as LinkIcon, Loader2 } from 'lucide-react'

import { AppShell } from '@/components/app-shell'
import { useAutoSign } from '@/hooks/use-auto-sign'
import { useResolve } from '@/hooks/use-resolve'
import { ORI_CHAIN_ID, ORI_DECIMALS, ORI_DENOM, ORI_SYMBOL, APP_URL } from '@/lib/chain-config'
import { msgCreateDirectedGift, msgCreateLinkGift } from '@/lib/contracts'
import { randomBytes, sha256, toBase64, toHex } from '@/lib/crypto'
import { createPaymentLink } from '@/lib/api'
import { GIFT_THEME, type GiftTheme } from '@ori/shared-types'
import { buildAutoSignFee, extractMoveEventData, sendTx } from '@/lib/tx'

type Mode = 'directed' | 'link'

const THEMES: Array<{ id: GiftTheme; label: string; emoji: string }> = [
  { id: GIFT_THEME.GENERIC, label: 'Generic', emoji: '✨' },
  { id: GIFT_THEME.BIRTHDAY, label: 'Birthday', emoji: '🎂' },
  { id: GIFT_THEME.THANKS, label: 'Thanks', emoji: '🙏' },
  { id: GIFT_THEME.CONGRATS, label: 'Congrats', emoji: '🎉' },
  { id: GIFT_THEME.CUSTOM, label: 'Custom', emoji: '💝' },
]

export default function NewGiftPage() {
  const params = useSearchParams()
  const router = useRouter()
  const toParam = params.get('to') ?? ''

  const kit = useInterwovenKit()
  const { initiaAddress, isConnected, openConnect } = kit
  const { isEnabled: autoSign } = useAutoSign()

  const [mode, setMode] = useState<Mode>(toParam ? 'directed' : 'link')
  const [recipient, setRecipient] = useState(toParam)
  const [amount, setAmount] = useState('')
  const [message, setMessage] = useState('')
  const [theme, setTheme] = useState<GiftTheme>(GIFT_THEME.GENERIC)
  const [busy, setBusy] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)

  const { data: resolved, isFetching: resolving } = useResolve(
    mode === 'directed' ? recipient : null,
  )

  const selectedTheme = useMemo(() => THEMES.find((t) => t.id === theme)!, [theme])

  const handleCreate = async () => {
    if (!isConnected) {
      openConnect()
      return
    }
    if (!initiaAddress) return
    const base = toBaseUnits(amount, ORI_DECIMALS)
    if (base <= 0n) {
      toast.error('Enter an amount')
      return
    }

    setBusy(true)
    setShareUrl(null)
    try {
      if (mode === 'directed') {
        if (!resolved?.initiaAddress) {
          toast.error('Resolve recipient first')
          return
        }
        const msg = msgCreateDirectedGift({
          sender: initiaAddress,
          recipient: resolved.initiaAddress,
          amount: base,
          theme,
          message,
          denom: ORI_DENOM,
        })
        await sendTx(kit, {
          chainId: ORI_CHAIN_ID,
          messages: [msg],
          autoSign,
          fee: autoSign ? buildAutoSignFee(600_000) : undefined,
        })
        toast.success(`Gift sent to ${resolved.initName ?? 'recipient'}`)
        router.push(`/chat/${encodeURIComponent(resolved.initName ?? resolved.initiaAddress)}`)
      } else {
        // Link gift: generate secret, hash, post on-chain, register link off-chain.
        const secret = await randomBytes(32)
        const secretHash = await sha256(secret)
        const secretHashHex = toHex(secretHash)

        const msg = msgCreateLinkGift({
          sender: initiaAddress,
          amount: base,
          theme,
          message,
          secretHash,
          denom: ORI_DENOM,
        })
        const tx = await sendTx(kit, {
          chainId: ORI_CHAIN_ID,
          messages: [msg],
          autoSign,
          fee: autoSign ? buildAutoSignFee(600_000) : undefined,
        })

        const giftData = extractMoveEventData(tx.rawResponse, '::gift_packet::GiftCreated')
        const giftId = giftData && giftData.id != null ? String(giftData.id) : undefined

        const link = await createPaymentLink({
          amount: base.toString(),
          denom: ORI_DENOM,
          theme,
          message,
          secretHashHex,
          onChainGiftId: giftId,
        })

        const secretB64 = toBase64(secret)
        const url = `${APP_URL}/claim/${link.shortCode}#${encodeURIComponent(secretB64)}`
        setShareUrl(url)
        toast.success('Link created')
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gift failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AppShell title="New gift">
      <div className="max-w-md mx-auto w-full px-5 py-5 space-y-4">
        <h1 className="text-2xl font-bold inline-flex items-center gap-2">
          <Gift className="w-6 h-6 text-primary" />
          Gift-wrap a payment
        </h1>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setMode('directed')}
            className={
              'rounded-xl border py-2 text-sm ' +
              (mode === 'directed'
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-muted text-muted-foreground')
            }
          >
            Directed
          </button>
          <button
            onClick={() => setMode('link')}
            className={
              'rounded-xl border py-2 text-sm inline-flex items-center justify-center gap-1.5 ' +
              (mode === 'link'
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-muted text-muted-foreground')
            }
          >
            <LinkIcon className="w-4 h-4" />
            Shareable link
          </button>
        </div>

        {mode === 'directed' && (
          <label className="block">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">To</span>
            <input
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="alice.init or init1…"
              className="mt-1 w-full rounded-xl bg-muted border border-border px-3 py-3 font-mono focus:outline-none focus:border-primary"
            />
            {resolving && <div className="mt-1 text-xs text-muted-foreground">Resolving…</div>}
            {resolved && (
              <div className="mt-1 text-xs text-success">
                Resolved → {resolved.initName ?? shorten(resolved.initiaAddress)}
              </div>
            )}
          </label>
        )}

        <label className="block">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">Theme</span>
          <div className="mt-1 grid grid-cols-5 gap-2">
            {THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={
                  'rounded-xl border py-2 text-sm flex flex-col items-center ' +
                  (theme === t.id
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-muted')
                }
              >
                <span className="text-xl">{t.emoji}</span>
                <span className="text-[10px] mt-0.5 text-muted-foreground">{t.label}</span>
              </button>
            ))}
          </div>
        </label>

        <label className="block">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">Amount</span>
          <div className="mt-1 flex items-center gap-2">
            <input
              inputMode="decimal"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="flex-1 rounded-xl bg-muted border border-border px-3 py-3 text-xl font-semibold focus:outline-none focus:border-primary"
            />
            <span className="text-sm text-muted-foreground">{ORI_SYMBOL}</span>
          </div>
        </label>

        <label className="block">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">Message</span>
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={280}
            placeholder={selectedTheme.emoji + ' write something kind'}
            className="mt-1 w-full rounded-xl bg-muted border border-border px-3 py-3 focus:outline-none focus:border-primary"
          />
        </label>

        <button
          onClick={() => void handleCreate()}
          disabled={busy}
          className="w-full rounded-2xl py-4 bg-primary text-primary-foreground font-medium disabled:opacity-50 inline-flex items-center justify-center gap-2"
        >
          {busy && <Loader2 className="w-4 h-4 animate-spin" />}
          {busy
            ? 'Sending…'
            : mode === 'directed'
              ? `Send gift${autoSign ? ' · 1-tap' : ''}`
              : `Create link${autoSign ? ' · 1-tap' : ''}`}
        </button>

        {shareUrl && (
          <div className="rounded-2xl border border-success/40 bg-success/10 p-4">
            <div className="flex items-center gap-2 text-success font-semibold">
              <LinkIcon className="w-4 h-4" />
              Share this link
            </div>
            <div className="mt-2 text-[11px] font-mono break-all">{shareUrl}</div>
            <button
              onClick={() => {
                void navigator.clipboard.writeText(shareUrl)
                toast.success('Copied')
              }}
              className="mt-3 w-full rounded-xl py-2 bg-muted border border-border text-sm inline-flex items-center justify-center gap-2"
            >
              <Copy className="w-4 h-4" />
              Copy
            </button>
            <p className="mt-2 text-[11px] text-muted-foreground">
              The secret after <code>#</code> never leaves the recipient&rsquo;s browser unless they
              click it. Keep this URL private until you&rsquo;re ready to share.
            </p>
          </div>
        )}
      </div>
    </AppShell>
  )
}

function toBaseUnits(human: string, decimals: number): bigint {
  if (!human) return 0n
  const [whole, fracRaw = ''] = human.split('.') as [string, string?]
  const frac = (fracRaw + '0'.repeat(decimals)).slice(0, decimals)
  return BigInt(whole || '0') * 10n ** BigInt(decimals) + BigInt(frac || '0')
}

function shorten(a: string): string {
  return `${a.slice(0, 10)}…${a.slice(-4)}`
}

