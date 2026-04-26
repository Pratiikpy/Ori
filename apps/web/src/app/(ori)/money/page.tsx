'use client'

/**
 * Money page — wired against backend.
 *
 * Visual layout: verbatim port of ui-ref-orii/frontend/src/pages/Money.jsx.
 * Wiring strategy:
 *   - Wallet + portfolio summary → real connected wallet state and
 *     usePortfolio(initiaAddress).
 *   - Tab actions → ActionDialog collects inputs; handleComplete routes to
 *     real Move helpers, or the documented REST sponsor/link endpoints.
 *
 * Per-action mapping documented in apps/web/_protocol/verify/Money.md.
 */
import { useState } from 'react'
import { ArrowUpRight, Gift, Radio, WalletCards } from 'lucide-react'
import { useInterwovenKit } from '@initia/interwovenkit-react'
import { toast } from 'sonner'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import {
  ActionCard,
  ActionDialog,
  type Action,
  type ActionRecord,
} from '@/components/action-dialog'
import { media, moneyTabs } from '@/data/ori-data'
import { usePortfolio } from '@/hooks/use-portfolio'
import { useAutoSign } from '@/hooks/use-auto-sign'
import {
  API_URL,
  ORI_CHAIN_ID,
  ORI_DECIMALS,
  ORI_DENOM,
} from '@/lib/chain-config'
import {
  msgBatchSend,
  msgCreateDirectedGift,
  msgCreateGroupGift,
  msgCreateLinkGift,
  msgClaimDirectedGift,
  msgClaimGroupSlot,
  msgClaimLinkGift,
  msgCloseStream,
  msgCreatePaywall,
  msgDeactivateSubscriptionPlan,
  msgDeactivatePaywall,
  msgCancelSubscription,
  msgOpenStream,
  msgPurchasePaywall,
  msgReclaimExpiredGift,
  msgReclaimExpiredGroup,
  msgRegisterGiftBox,
  msgRegisterMerchant,
  msgRegisterSubscriptionPlan,
  msgReleaseSubscriptionPeriod,
  msgSendPayment,
  msgSubscribe,
  msgWithdrawStream,
  msgTip,
} from '@/lib/contracts'
import { resolve } from '@/lib/resolve'
import { deriveChatId, randomBytes, sha256 } from '@/lib/crypto'
import { buildAutoSignFee, extractTxHash, friendlyError, sendTx, txExplorerUrl } from '@/lib/tx'
import { getSessionToken, markLinkClaimed } from '@/lib/api'
import { CopyButton } from '@/components/copy-button'

// ---------- helpers ----------

/** stats.tipsReceivedVolume is a base-units string ("1500000"). Render as "1.5 INIT". */
function formatINIT(raw: string | number | null | undefined): string {
  if (raw === null || raw === undefined || raw === '') return '0 INIT'
  const n = Number(raw) / 10 ** ORI_DECIMALS
  if (!Number.isFinite(n)) return '0 INIT'
  return `${n.toLocaleString(undefined, { maximumFractionDigits: 4 })} INIT`
}

/** "1.5" → 1500000n with ORI_DECIMALS. Empty → 0n. */
function toBaseUnits(human: string): bigint {
  if (!human) return 0n
  const cleaned = human.replace(/[^0-9.]/g, '')
  const [whole, fracRaw = ''] = cleaned.split('.') as [string, string?]
  const frac = (fracRaw + '0'.repeat(ORI_DECIMALS)).slice(0, ORI_DECIMALS)
  return BigInt(whole || '0') * 10n ** BigInt(ORI_DECIMALS) + BigInt(frac || '0')
}

function truncAddr(a: string | null | undefined): string {
  if (!a) return ''
  if (a.length < 14) return a
  return `${a.slice(0, 8)}…${a.slice(-4)}`
}

function parseNumericId(input: string): bigint {
  const cleaned = input.trim().replace(/^#/, '')
  if (!/^\d+$/.test(cleaned)) throw new Error('Numeric ID required')
  return BigInt(cleaned)
}

function parseSecretHex(input: string): Uint8Array {
  const cleanHex = input.trim().replace(/^0x/, '')
  if (!/^[0-9a-fA-F]+$/.test(cleanHex) || cleanHex.length % 2 !== 0) {
    throw new Error('Secret must be even-length hex')
  }
  return new Uint8Array(cleanHex.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)))
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

function parsePeriodSeconds(input: string): bigint {
  const trimmed = (input ?? '').trim().toLowerCase()
  if (/^\d+$/.test(trimmed)) return BigInt(trimmed)
  if (trimmed.startsWith('day')) return 86_400n
  if (trimmed.startsWith('week')) return 604_800n
  if (trimmed.startsWith('quarter')) return 7_776_000n
  if (trimmed.startsWith('month') || trimmed === '') return 2_592_000n
  const n = Number(trimmed)
  return Number.isFinite(n) && n > 0 ? BigInt(Math.floor(n)) : 2_592_000n
}

// ---------- page ----------

export default function MoneyPage() {
  const kit = useInterwovenKit()
  const { initiaAddress, isConnected, openConnect } = kit
  const { isEnabled: autoSign } = useAutoSign()

  const portfolio = usePortfolio(initiaAddress)
  const stats = portfolio.data?.stats

  const [modalAction, setModalAction] = useState<Action | null>(null)
  const [recentAction, setRecentAction] = useState<ActionRecord | null>(null)
  // Persistent receipt for newly-created link gifts. The secret can't be
  // recovered after this dialog closes — see useEffect that surfaces a
  // browser-warning beforeunload while the receipt is pending.
  const [linkGiftReceipt, setLinkGiftReceipt] = useState<{
    secretHex: string
    shortCode: string
    txHash: string
  } | null>(null)

  const sendOne = async (msg: ReturnType<typeof msgSendPayment>) => {
    return sendTx(kit, {
      chainId: ORI_CHAIN_ID,
      messages: [msg],
      autoSign,
      fee: autoSign ? buildAutoSignFee(500_000) : undefined,
    })
  }

  /**
   * Show a success toast that includes the tx hash and an "View on explorer"
   * action button. Falls back to a plain success toast if the hash couldn't
   * be extracted (e.g., the rollup returned a non-standard response shape).
   */
  function toastTx(
    label: string,
    res: Awaited<ReturnType<typeof sendOne>>,
    extraDescription?: string,
  ): void {
    const hash = extractTxHash(res.rawResponse) || res.txHash
    const url = hash ? txExplorerUrl(hash) : null
    const desc = [
      hash ? `Tx ${hash.slice(0, 10)}…` : null,
      extraDescription,
    ]
      .filter(Boolean)
      .join(' · ')
    toast.success(label, {
      description: desc || undefined,
      action: url
        ? { label: 'View tx', onClick: () => window.open(url, '_blank') }
        : undefined,
    })
  }

  const handleComplete = async (record: ActionRecord): Promise<void> => {
    setRecentAction(record)

    // Sponsor REST first — pure fetch, no chain.
    if (record.id === 'sponsor-status') {
      const wallet = (record.values['Wallet address'] || initiaAddress || '').trim()
      if (!wallet) {
        toast.error('Connect a wallet or supply an address')
        return
      }
      try {
        const res = await fetch(
          `${API_URL}/v1/sponsor/status?address=${encodeURIComponent(wallet)}`,
        )
        if (!res.ok) throw new Error(`status ${res.status}`)
        const json = (await res.json()) as Record<string, unknown>
        toast.success('Sponsor status', {
          description: JSON.stringify(json).slice(0, 160),
        })
      } catch (e) {
        toast.error(friendlyError(e))
      }
      return
    }
    if (record.id === 'claim-seed') {
      const wallet = (record.values['New wallet address'] || initiaAddress || '').trim()
      if (!wallet) {
        toast.error('Wallet address required')
        return
      }
      try {
        const res = await fetch(`${API_URL}/v1/sponsor/seed`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address: wallet }),
        })
        if (!res.ok) throw new Error(`seed ${res.status}`)
        toast.success('Seed claim submitted')
      } catch (e) {
        toast.error(friendlyError(e))
      }
      return
    }
    if (record.id === 'sponsored-username') {
      const slug = (record.values['Desired .init'] || '').trim()
      const bio = record.values['Bio'] || ''
      if (!slug) {
        toast.error('Pick a .init slug')
        return
      }
      if (!initiaAddress) {
        toast.error('Connect a wallet first')
        return
      }
      try {
        const res = await fetch(`${API_URL}/v1/sponsor/username`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address: initiaAddress, slug, bio }),
        })
        if (!res.ok) throw new Error(`username ${res.status}`)
        toast.success(`Sponsored .init queued for ${slug}`)
      } catch (e) {
        toast.error(friendlyError(e))
      }
      return
    }

    // The rest are on-chain msg* dispatches.
    if (!isConnected || !initiaAddress) {
      void openConnect()
      return
    }

    try {
      switch (record.id) {
        // ----- payments -----
        case 'send-payment': {
          const recipientInput = record.values['Recipient .init or address'] || ''
          const amountStr = record.values['Amount'] || ''
          const memo = record.values['Memo'] || ''
          const r = await resolve(recipientInput.trim())
          if (!r?.initiaAddress) throw new Error('Recipient could not be resolved')
          const baseUnits = toBaseUnits(amountStr)
          if (baseUnits <= 0n) throw new Error('Amount must be > 0')
          const chatId = await deriveChatId(initiaAddress, r.initiaAddress)
          const msg = msgSendPayment({
            sender: initiaAddress,
            recipient: r.initiaAddress,
            amount: baseUnits,
            memo,
            chatId,
            denom: ORI_DENOM,
          })
          const __r = await sendOne(msg)
          toastTx(`Sent ${amountStr} INIT`, __r)
          return
        }

        case 'bulk-send': {
          const csv = record.values['Recipients CSV'] || ''
          const totalStr = record.values['Total amount'] || ''
          const rows = csv
            .split(/\r?\n|;/)
            .map((r) => r.trim())
            .filter(Boolean)
          if (rows.length === 0) throw new Error('At least one recipient required')
          const recipients: string[] = []
          const amounts: bigint[] = []
          const memos: string[] = []
          const totalBase = toBaseUnits(totalStr)
          const split = rows.length > 0 ? totalBase / BigInt(rows.length) : 0n
          // Integer division truncates: 7 INIT / 3 = 2.333 → 2 base units,
          // total transferred 6.999. Detect non-zero remainder and assign
          // it to the LAST per-row default-amount so the CSV sums to the
          // user-typed total. Per-row explicit amounts override and are
          // not adjusted.
          const remainder = totalBase - split * BigInt(rows.length)
          let defaultedSlots = 0
          for (let i = 0; i < rows.length; i++) {
            const row = rows[i]!
            const cells = row.split(',').map((c) => c.trim())
            const who = cells[0] ?? ''
            const amt = cells[1] ?? ''
            const m = cells[2] ?? ''
            if (!who) throw new Error('Empty recipient row')
            const r = await resolve(who)
            if (!r?.initiaAddress) throw new Error(`Could not resolve ${who}`)
            recipients.push(r.initiaAddress)
            if (amt) {
              amounts.push(toBaseUnits(amt))
            } else {
              defaultedSlots++
              // Last defaulted row absorbs the remainder so the CSV sums
              // exactly to the user-typed total.
              const isLastDefault = defaultedSlots === rows.filter((rw) => {
                const c = rw.split(',').map((s) => s.trim())
                return !(c[1] ?? '')
              }).length
              amounts.push(isLastDefault ? split + remainder : split)
            }
            memos.push(m)
          }
          if (remainder > 0n && defaultedSlots > 0) {
            toast.message('Rounding adjustment', {
              description: `Total didn't divide evenly across recipients — last defaulted row carries the ${remainder} u${ORI_DENOM} remainder.`,
            })
          }
          const batchId = `batch-${Date.now()}`
          const msg = msgBatchSend({
            sender: initiaAddress,
            recipients,
            amounts,
            memos,
            denom: ORI_DENOM,
            batchId,
          })
          const __r = await sendOne(msg)
          toastTx(`Bulk sent to ${recipients.length}`, __r)
          return
        }

        case 'tip-creator': {
          const creatorInput = record.values['Creator .init'] || ''
          const amountStr = record.values['Amount'] || ''
          const message = record.values['Public message'] || ''
          const r = await resolve(creatorInput.trim())
          if (!r?.initiaAddress) throw new Error('Creator could not be resolved')
          const baseUnits = toBaseUnits(amountStr)
          if (baseUnits <= 0n) throw new Error('Amount must be > 0')
          const __r = await sendOne(
            msgTip({
              sender: initiaAddress,
              creator: r.initiaAddress,
              amount: baseUnits,
              message,
              denom: ORI_DENOM,
            }),
          )
          toastTx('Tip sent', __r)
          return
        }

        // ----- gifts -----
        case 'create-link-gift': {
          const amountStr = record.values['Amount'] || ''
          const expiry = record.values['Expiry'] || '0'
          const baseUnits = toBaseUnits(amountStr)
          if (baseUnits <= 0n) throw new Error('Amount must be > 0')
          const secret = await randomBytes(32)
          const secretHash = await sha256(secret)
          const ttl = BigInt(Number(expiry) || 0)
          let shortCode = ''
          try {
            const token = getSessionToken()
            const linkRes = await fetch(`${API_URL}/v1/links`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
              body: JSON.stringify({
                amount: baseUnits.toString(),
                denom: ORI_DENOM,
                theme: 0,
                message: record.values['Shortcode'] || '',
                secretHashHex: bytesToHex(secretHash),
              }),
            })
            if (linkRes.ok) {
              const body = (await linkRes.json()) as { shortCode: string }
              shortCode = body.shortCode
            }
          } catch {
            /* on-chain gift creation remains authoritative */
          }
          const __r = await sendOne(
            msgCreateLinkGift({
              sender: initiaAddress,
              amount: baseUnits,
              theme: 0,
              message: record.values['Shortcode'] || '',
              secretHash,
              ttlSeconds: ttl,
              denom: ORI_DENOM,
            }),
          )
          // Persistent modal — the gift secret cannot be recovered after
          // this point. Showing it only in a transient toast risked the
          // user blinking and losing access to the funds. Modal stays open
          // until explicitly dismissed and offers per-field copy buttons.
          setLinkGiftReceipt({
            secretHex: bytesToHex(secret),
            shortCode,
            txHash: extractTxHash(__r.rawResponse) || __r.txHash,
          })
          toastTx('Link gift created', __r)
          return
        }

        case 'create-directed-gift': {
          const recipientInput = record.values['Recipient .init or address'] || ''
          const amountStr = record.values['Amount'] || ''
          const memo = record.values['Memo'] || ''
          const r = await resolve(recipientInput.trim())
          if (!r?.initiaAddress) throw new Error('Recipient could not be resolved')
          const baseUnits = toBaseUnits(amountStr)
          if (baseUnits <= 0n) throw new Error('Amount must be > 0')
          const __r = await sendOne(
            msgCreateDirectedGift({
              sender: initiaAddress,
              recipient: r.initiaAddress,
              amount: baseUnits,
              theme: 0,
              message: memo,
              ttlSeconds: 0n,
              denom: ORI_DENOM,
            }),
          )
          toastTx('Directed gift created', __r)
          return
        }

        case 'create-group-gift': {
          const totalStr = record.values['Total amount'] || ''
          const slotsStr = record.values['Claim slots'] || ''
          const expiry = record.values['Expiry'] || '0'
          const total = toBaseUnits(totalStr)
          const slots = BigInt(Number(slotsStr) || 0)
          if (total <= 0n) throw new Error('Total must be > 0')
          if (slots <= 0n) throw new Error('At least one slot required')
          const hashes: Uint8Array[] = []
          for (let i = 0n; i < slots; i++) {
            const s = await randomBytes(32)
            hashes.push(await sha256(s))
          }
          const __r = await sendOne(
            msgCreateGroupGift({
              sender: initiaAddress,
              totalAmount: total,
              slotCount: slots,
              theme: 0,
              message: '',
              secretHashes: hashes,
              ttlSeconds: BigInt(Number(expiry) || 0),
              denom: ORI_DENOM,
            }),
          )
          toastTx(`Group gift created (${slots.toString()} slots)`, __r)
          return
        }

        case 'claim-link-gift': {
          const giftId = parseNumericId(record.values['Gift ID'] || '')
          const secretBytes = parseSecretHex(record.values['Secret hex'] || '')
          const __r = await sendOne(
            msgClaimLinkGift({
              claimer: initiaAddress,
              giftId,
              secret: secretBytes,
            }),
          )
          toastTx('Link gift claimed', __r)
          // Mirror the claim to the off-chain link store so /v1/links/<short>
          // reports claimed=true and the OG preview / quest counters update.
          // Best-effort: a backend hiccup here doesn't undo the on-chain
          // claim, but does mean the off-chain row stays stale until the
          // event-listener catches up.
          const shortCode = (record.values['Short code'] || '').trim()
          if (shortCode) {
            try {
              await markLinkClaimed(shortCode, initiaAddress)
            } catch (err) {
              // eslint-disable-next-line no-console
              console.warn('markLinkClaimed failed (non-fatal):', err)
            }
          }
          return
        }

        case 'claim-directed-gift': {
          const idStr = record.values['Gift ID'] || ''
          const giftId = parseNumericId(idStr)
          const __r = await sendOne(
            msgClaimDirectedGift({ claimer: initiaAddress, giftId }),
          )
          toastTx('Directed gift claimed', __r)
          return
        }

        case 'claim-group-slot': {
          const giftId = parseNumericId(record.values['Group gift ID'] || '')
          const slotIndex = parseNumericId(record.values['Slot index'] || '')
          const secret = parseSecretHex(record.values['Secret hex'] || '')
          const __r = await sendOne(
            msgClaimGroupSlot({ claimer: initiaAddress, giftId, slotIndex, secret }),
          )
          toastTx('Group gift slot claimed', __r)
          return
        }

        case 'reclaim-expired-gift': {
          const idStr = record.values['Gift ID'] || ''
          const giftId = parseNumericId(idStr)
          const __r = await sendOne(
            msgReclaimExpiredGift({ sender: initiaAddress, giftId }),
          )
          toastTx('Reclaimed expired gift', __r)
          return
        }

        case 'reclaim-expired-group': {
          const giftId = parseNumericId(record.values['Group gift ID'] || '')
          const __r = await sendOne(msgReclaimExpiredGroup({ sender: initiaAddress, giftId }))
          toastTx('Reclaimed expired group gift', __r)
          return
        }

        case 'register-gift-box': {
          const name = record.values['Template name'] || ''
          const themeJson = record.values['Theme JSON'] || '{}'
          const defaultAmt = record.values['Default amount'] || ''
          const __r = await sendOne(
            msgRegisterGiftBox({
              admin: initiaAddress,
              name,
              theme: 0,
              imageUri: '',
              description: themeJson,
              accentHex: '#0022FF',
              featuredOrder: BigInt(Number(defaultAmt) || 0),
            }),
          )
          toastTx('Gift box template registered', __r)
          return
        }

        // ----- streams -----
        case 'open-stream': {
          const recipientInput = record.values['Recipient .init or address'] || ''
          const rate = toBaseUnits(record.values['Rate per second'] || '')
          const durationSeconds = BigInt(Number(record.values['Duration seconds'] || 0))
          const r = await resolve(recipientInput.trim())
          if (!r?.initiaAddress) throw new Error('Recipient could not be resolved')
          if (rate <= 0n) throw new Error('Rate must be > 0')
          if (durationSeconds <= 0n) throw new Error('Duration must be > 0')
          const __r = await sendOne(
            msgOpenStream({
              sender: initiaAddress,
              recipient: r.initiaAddress,
              ratePerSecond: rate,
              durationSeconds,
              denom: ORI_DENOM,
            }),
          )
          toastTx('Payment stream opened', __r)
          return
        }

        case 'withdraw-stream': {
          const streamId = parseNumericId(record.values['Stream ID'] || '')
          const __r = await sendOne(msgWithdrawStream({ recipient: initiaAddress, streamId }))
          toastTx('Stream withdrawal submitted', __r)
          return
        }

        case 'close-stream': {
          const streamId = parseNumericId(record.values['Stream ID'] || '')
          const __r = await sendOne(msgCloseStream({ sender: initiaAddress, streamId }))
          toastTx('Stream close submitted', __r)
          return
        }

        // ----- subscriptions -----
        case 'register-plan': {
          const priceStr = record.values['Period price'] || ''
          const cadence = record.values['Billing cadence'] || ''
          const baseUnits = toBaseUnits(priceStr)
          if (baseUnits <= 0n) throw new Error('Price must be > 0')
          const __r = await sendOne(
            msgRegisterSubscriptionPlan({
              creator: initiaAddress,
              pricePerPeriod: baseUnits,
              periodSeconds: parsePeriodSeconds(cadence),
              denom: ORI_DENOM,
            }),
          )
          toastTx('Subscription plan registered', __r)
          return
        }

        case 'subscribe-plan': {
          const creatorInput = record.values['Creator .init'] || ''
          const planIdStr = record.values['Plan ID'] || '1'
          const r = await resolve(creatorInput.trim())
          if (!r?.initiaAddress) throw new Error('Creator could not be resolved')
          const periods = BigInt(Number(planIdStr) || 1)
          const __r = await sendOne(
            msgSubscribe({
              subscriber: initiaAddress,
              creator: r.initiaAddress,
              periods,
            }),
          )
          toastTx('Subscribed', __r)
          return
        }

        case 'release-period': {
          // Plan ID = subscriber addr/.init, Period = creator addr/.init.
          const planId = record.values['Plan ID'] || ''
          const period = record.values['Period'] || ''
          const sub = await resolve(planId.trim())
          const creator = await resolve(period.trim())
          if (!sub?.initiaAddress || !creator?.initiaAddress)
            throw new Error('Subscriber and creator must resolve')
          const __r = await sendOne(
            msgReleaseSubscriptionPeriod({
              caller: initiaAddress,
              subscriber: sub.initiaAddress,
              creator: creator.initiaAddress,
            }),
          )
          toastTx('Period released', __r)
          return
        }

        case 'cancel-subscription': {
          const creatorInput = record.values['Creator .init or address'] || ''
          const creator = await resolve(creatorInput.trim())
          if (!creator?.initiaAddress) throw new Error('Creator could not be resolved')
          const __r = await sendOne(
            msgCancelSubscription({ subscriber: initiaAddress, creator: creator.initiaAddress }),
          )
          toastTx('Subscription cancelled', __r)
          return
        }

        case 'deactivate-plan': {
          const __r = await sendOne(
            msgDeactivateSubscriptionPlan({ creator: initiaAddress }),
          )
          toastTx('Plan deactivated', __r)
          return
        }

        // ----- paywalls + merchant -----
        case 'create-paywall': {
          const title = record.values['Title'] || ''
          const resourceUri = record.values['Content link or promise'] || ''
          const price = toBaseUnits(record.values['Price'] || '')
          if (!title.trim()) throw new Error('Title required')
          if (!resourceUri.trim()) throw new Error('Content link or promise required')
          if (price <= 0n) throw new Error('Price must be > 0')
          const __r = await sendOne(
            msgCreatePaywall({ creator: initiaAddress, title, resourceUri, price, denom: ORI_DENOM }),
          )
          toastTx('Paywall created', __r)
          return
        }

        case 'purchase-paywall': {
          const paywallId = parseNumericId(record.values['Paywall ID'] || '')
          const __r = await sendOne(msgPurchasePaywall({ buyer: initiaAddress, paywallId }))
          toastTx('Paywall purchase submitted', __r)
          return
        }

        case 'deactivate-paywall': {
          const paywallId = parseNumericId(record.values['Paywall ID'] || '')
          const __r = await sendOne(msgDeactivatePaywall({ creator: initiaAddress, paywallId }))
          toastTx('Paywall deactivated', __r)
          return
        }

        case 'register-merchant': {
          const acceptedDenoms = (record.values['Accepted denoms CSV'] || ORI_DENOM)
            .split(',')
            .map((v) => v.trim())
            .filter(Boolean)
          const __r = await sendOne(
            msgRegisterMerchant({
              owner: initiaAddress,
              name: record.values['Merchant name'] || '',
              category: record.values['Category'] || 'creator',
              logoUrl: record.values['Logo URL'] || '',
              contact: record.values['Contact'] || '',
              acceptedDenoms,
            }),
          )
          toastTx('Merchant registration submitted', __r)
          return
        }

        default:
          toast.error(`${record.title} is not available in this build`)
      }
    } catch (e) {
      toast.error(friendlyError(e))
    }
  }

  const balanceValue = isConnected ? truncAddr(initiaAddress) : 'Connect wallet'
  const balanceKicker = isConnected ? 'Connected wallet' : 'No wallet'

  return (
    <section className="p-4 sm:p-6 lg:p-8" data-testid="money-page">
      <div
        className="grid grid-cols-1 gap-4 lg:grid-cols-4"
        data-testid="money-overview-grid"
      >
        <div
          className="relative border border-black/10 bg-black p-6 text-white lg:col-span-2"
          data-testid="money-balance-card"
        >
          <p
            className="text-xs font-bold uppercase tracking-[0.2em] text-white/60"
            data-testid="money-balance-label"
          >
            Wallet
          </p>
          <h2
            className="mt-4 font-mono text-3xl font-black tracking-tight md:text-4xl"
            data-testid="money-balance-value"
          >
            {balanceValue}
          </h2>
          <p
            className="mt-3 text-xs font-mono uppercase tracking-[0.2em] text-white/60"
            data-testid="money-balance-kicker"
          >
            {balanceKicker}
          </p>
          <p
            className="mt-4 max-w-xl text-sm leading-6 text-white/70"
            data-testid="money-balance-detail"
          >
            Connected actions below submit through the existing wallet integration and Ori backend endpoints.
          </p>
          {!isConnected && (
            <Button
              type="button"
              onClick={() => void openConnect()}
              className="mt-4 rounded-none bg-white text-black hover:bg-[#0022FF] hover:text-white"
              data-testid="money-balance-connect"
            >
              Connect wallet
            </Button>
          )}
        </div>

        <div
          className="relative border border-black/10 bg-white p-6"
          data-testid="money-agent-budget-card"
        >
          <Radio className="h-6 w-6 text-[#0022FF]" />
          <p
            className="mt-5 text-xs font-bold uppercase tracking-[0.2em] text-[#52525B]"
            data-testid="money-agent-budget-label"
          >
            Activity totals
          </p>
          <p className="mt-2 font-mono text-2xl font-black" data-testid="money-agent-budget-value">
            {stats ? `${stats.paymentsSent + stats.tipsGiven} sent` : '—'}
          </p>
          <p className="mt-4 font-mono text-xs text-[#52525B]" data-testid="money-agent-budget-progress">
            {stats ? `${stats.paymentsReceived + stats.tipsReceived} received · ${stats.giftsClaimed} gifts claimed` : 'Connect wallet for portfolio stats'}
          </p>
        </div>

        {/* Gift visual (KEEP) */}
        <div
          className="overflow-hidden border border-black/10 bg-[#F5F5F5]"
          data-testid="money-gift-visual-card"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={media.gift}
            alt="Gift box abstract visual"
            className="h-full min-h-48 w-full object-cover"
            data-testid="money-gift-visual-image"
          />
        </div>
      </div>

      {/* Portfolio grid (WIRE) */}
      <div
        className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4"
        data-testid="portfolio-grid"
      >
        {portfolio.isLoading || !stats
          ? Array.from({ length: 4 }).map((_, i) => (
              <article
                key={`skeleton-${i}`}
                className="border border-black/10 bg-white p-5"
                data-testid={`portfolio-item-skeleton-${i}`}
              >
                <div className="h-5 w-24 animate-pulse bg-black/10" />
                <div className="mt-4 h-7 w-32 animate-pulse bg-black/10" />
                <div className="mt-2 h-3 w-20 animate-pulse bg-black/10" />
              </article>
            ))
          : (() => {
              const tiles = [
                {
                  id: 'payments',
                  asset: 'Payments',
                  value: String(stats.paymentsSent ?? 0),
                  amount: `${stats.paymentsReceived ?? 0} received`,
                  change: stats.lastActiveAt ? 'recent' : '—',
                },
                {
                  id: 'tips',
                  asset: 'Tips',
                  value: formatINIT(stats.tipsReceivedVolume),
                  amount: `${stats.tipsReceived ?? 0} received`,
                  change: 'net',
                },
                {
                  id: 'gifts',
                  asset: 'Gifts',
                  value: String(stats.giftsSent ?? 0),
                  amount: `${stats.giftsClaimed ?? 0} claimed`,
                  change: '—',
                },
                {
                  id: 'social',
                  asset: 'Social',
                  value: `${stats.followersCount ?? 0} followers`,
                  amount: `${stats.followingCount ?? 0} following`,
                  change: '',
                },
              ]
              return tiles.map((item) => (
                <article
                  key={item.id}
                  className="border border-black/10 bg-white p-5"
                  data-testid={`portfolio-item-${item.id}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p
                      className="font-heading text-xl font-bold"
                      data-testid={`portfolio-asset-${item.id}`}
                    >
                      {item.asset}
                    </p>
                    {item.change && (
                      <span
                        className="flex items-center gap-1 font-mono text-xs text-[#0022FF]"
                        data-testid={`portfolio-change-${item.id}`}
                      >
                        {item.change}
                        <ArrowUpRight className="h-3 w-3" />
                      </span>
                    )}
                  </div>
                  <p
                    className="mt-4 font-mono text-2xl font-black"
                    data-testid={`portfolio-value-${item.id}`}
                  >
                    {item.value}
                  </p>
                  <p
                    className="mt-1 font-mono text-xs text-[#52525B]"
                    data-testid={`portfolio-amount-${item.id}`}
                  >
                    {item.amount}
                  </p>
                </article>
              ))
            })()}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="payments" className="mt-8" data-testid="money-tabs">
        <TabsList
          className="flex h-auto w-full flex-wrap justify-start rounded-none border border-black/10 bg-white p-0"
          data-testid="money-tabs-list"
        >
          {moneyTabs.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="rounded-none border-r border-black/10 px-4 py-3 data-[state=active]:bg-[#0022FF] data-[state=active]:text-white"
              data-testid={`money-tab-${tab.id}`}
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {moneyTabs.map((tab) => {
          return (
            <TabsContent
              key={tab.id}
              value={tab.id}
              className="mt-4"
              data-testid={`money-tab-content-${tab.id}`}
            >
              <div
                className="mb-4 flex flex-col justify-between gap-3 border border-black/10 bg-[#F5F5F5] p-5 sm:flex-row sm:items-center"
                data-testid={`money-tab-summary-${tab.id}`}
              >
                <div>
                  <p
                    className="text-xs font-bold uppercase tracking-[0.2em] text-[#52525B] flex items-center gap-2"
                    data-testid={`money-tab-overline-${tab.id}`}
                  >
                    {tab.label}
                  </p>
                  <h2
                    className="font-heading text-3xl font-black tracking-tight"
                    data-testid={`money-tab-title-${tab.id}`}
                  >
                    {tab.summary}
                  </h2>
                </div>
                <div
                  className="flex items-center gap-2 font-mono text-sm text-[#0022FF]"
                  data-testid={`money-tab-count-${tab.id}`}
                >
                  {tab.actions.length} flows <WalletCards className="h-4 w-4" />
                </div>
              </div>
              <div
                className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
                data-testid={`money-actions-grid-${tab.id}`}
              >
                {tab.actions.map((action) => (
                  <ActionCard
                    key={action.id}
                    scope={`money-${tab.id}`}
                    action={action as Action}
                    onOpen={setModalAction}
                  />
                ))}
              </div>
            </TabsContent>
          )
        })}
      </Tabs>

      {recentAction && (
        <div
          className="fixed bottom-24 right-4 z-30 border border-[#0022FF] bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,34,255,1)]"
          data-testid="money-recent-action"
        >
          <Gift className="mr-2 inline h-4 w-4 text-[#0022FF]" />
          {recentAction.title} submitted at {recentAction.time}
        </div>
      )}
      <ActionDialog
        action={modalAction}
        onClose={() => setModalAction(null)}
        onComplete={handleComplete}
      />
      {linkGiftReceipt && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          data-testid="link-gift-receipt"
          onClick={(e) => {
            // Backdrop click does NOT dismiss — the receipt is critical
            // and a stray click should not lose the secret. User must
            // explicitly click "I've saved this".
            if (e.target === e.currentTarget) {
              toast.message('Save the secret first', {
                description: 'It cannot be recovered later — copy it before closing.',
              })
            }
          }}
        >
          <div className="w-full max-w-md border border-black/15 bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,34,255,1)]">
            <p className="font-heading text-2xl font-black tracking-tight">
              Link gift created
            </p>
            <p className="mt-2 text-sm text-[#52525B]">
              Save these details now. The secret unlocks the gift and is{' '}
              <strong>not stored anywhere</strong> after this dialog closes.
            </p>
            <div className="mt-5 space-y-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#52525B]">
                  Secret (hex)
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <code
                    className="block flex-1 break-all border border-black/10 bg-[#F5F5F5] p-2 font-mono text-xs"
                    data-testid="link-gift-secret"
                  >
                    0x{linkGiftReceipt.secretHex}
                  </code>
                  <CopyButton
                    value={`0x${linkGiftReceipt.secretHex}`}
                    label="Copy secret"
                  />
                </div>
              </div>
              {linkGiftReceipt.shortCode && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#52525B]">
                    Short code
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <code className="block flex-1 break-all border border-black/10 bg-[#F5F5F5] p-2 font-mono text-xs">
                      {linkGiftReceipt.shortCode}
                    </code>
                    <CopyButton
                      value={linkGiftReceipt.shortCode}
                      label="Copy short code"
                    />
                  </div>
                </div>
              )}
              {linkGiftReceipt.txHash && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#52525B]">
                    Tx hash
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <code className="block flex-1 break-all border border-black/10 bg-[#F5F5F5] p-2 font-mono text-xs">
                      {linkGiftReceipt.txHash}
                    </code>
                    <CopyButton value={linkGiftReceipt.txHash} label="Copy tx hash" />
                  </div>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setLinkGiftReceipt(null)}
              className="mt-6 w-full rounded-none bg-[#0022FF] px-4 py-3 text-sm text-white hover:bg-[#0019CC]"
              data-testid="link-gift-receipt-confirm"
            >
              I've saved these — close
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
