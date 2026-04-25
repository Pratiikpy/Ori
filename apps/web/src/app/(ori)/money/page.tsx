'use client'

/**
 * Money page — wired against backend.
 *
 * Visual layout: verbatim port of ui-ref-orii/frontend/src/pages/Money.jsx.
 * Wiring strategy:
 *   - Total wallet balance & Agent daily cap → STUB chips (no view fns yet).
 *   - Portfolio grid → usePortfolio(initiaAddress) → 4 real tiles from stats.*.
 *   - Tab actions → ActionDialog still drives the form; we wrap onComplete
 *     and route by `action.id` to msg* helpers + sendTx (or inline fetch
 *     for sponsor REST). Streams + paywalls + cancel-subscription = toast
 *     "Coming soon".
 *
 * Per-action mapping documented in apps/web/_protocol/verify/Money.md.
 */
import { useState } from 'react'
import { ArrowUpRight, Gift, Radio, WalletCards } from 'lucide-react'
import { useInterwovenKit } from '@initia/interwovenkit-react'
import { toast } from 'sonner'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
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
  msgClaimLinkGift,
  msgDeactivateSubscriptionPlan,
  msgReclaimExpiredGift,
  msgRegisterGiftBox,
  msgRegisterSubscriptionPlan,
  msgReleaseSubscriptionPeriod,
  msgSendPayment,
  msgSubscribe,
  msgTip,
} from '@/lib/contracts'
import { resolve } from '@/lib/resolve'
import { deriveChatId, randomBytes, sha256 } from '@/lib/crypto'
import { buildAutoSignFee, friendlyError, sendTx } from '@/lib/tx'

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

const COMING_SOON_IDS = new Set([
  // streams tab
  'open-stream',
  'withdraw-stream',
  'close-stream',
  // subscription cancel (no helper)
  'cancel-subscription',
  // paywalls tab
  'create-paywall',
  'purchase-paywall',
  'deactivate-paywall',
  'register-merchant',
])

const STUB_TAB_IDS = new Set(['streams', 'paywalls'])

// ---------- page ----------

export default function MoneyPage() {
  const kit = useInterwovenKit()
  const { initiaAddress, isConnected, openConnect } = kit
  const { isEnabled: autoSign } = useAutoSign()

  const portfolio = usePortfolio(initiaAddress)
  const stats = portfolio.data?.stats

  const [modalAction, setModalAction] = useState<Action | null>(null)
  const [recentAction, setRecentAction] = useState<ActionRecord | null>(null)

  const sendOne = async (msg: ReturnType<typeof msgSendPayment>) => {
    return sendTx(kit, {
      chainId: ORI_CHAIN_ID,
      messages: [msg],
      autoSign,
      fee: autoSign ? buildAutoSignFee(500_000) : undefined,
    })
  }

  const handleComplete = async (record: ActionRecord) => {
    setRecentAction(record)

    // Sponsor REST first — pure fetch, no chain.
    if (record.id === 'sponsor-status') {
      const wallet = (record.values['Wallet address'] || initiaAddress || '').trim()
      if (!wallet) return toast.error('Connect a wallet or supply an address')
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
      if (!wallet) return toast.error('Wallet address required')
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
      if (!slug) return toast.error('Pick a .init slug')
      if (!initiaAddress) return toast.error('Connect a wallet first')
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

    // Coming-soon stubs.
    if (COMING_SOON_IDS.has(record.id)) {
      toast.message('Coming soon', {
        description: `${record.title} — module wiring pending.`,
      })
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
          await sendOne(msg)
          toast.success(`Sent ${amountStr} INIT`)
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
          for (const row of rows) {
            const cells = row.split(',').map((c) => c.trim())
            const who = cells[0] ?? ''
            const amt = cells[1] ?? ''
            const m = cells[2] ?? ''
            if (!who) throw new Error('Empty recipient row')
            const r = await resolve(who)
            if (!r?.initiaAddress) throw new Error(`Could not resolve ${who}`)
            recipients.push(r.initiaAddress)
            amounts.push(amt ? toBaseUnits(amt) : split)
            memos.push(m)
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
          await sendOne(msg)
          toast.success(`Bulk sent to ${recipients.length}`)
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
          await sendOne(
            msgTip({
              sender: initiaAddress,
              creator: r.initiaAddress,
              amount: baseUnits,
              message,
              denom: ORI_DENOM,
            }),
          )
          toast.success('Tip sent')
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
          await sendOne(
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
          toast.success('Link gift created — keep the secret safe')
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
          await sendOne(
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
          toast.success('Directed gift created')
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
          await sendOne(
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
          toast.success(`Group gift created (${slots.toString()} slots)`)
          return
        }

        case 'claim-link-gift': {
          // Form re-uses the shortcode field for giftId, claim addr for hex secret.
          const idStr = record.values['Shortcode'] || ''
          const secretHex = record.values['Claiming address'] || ''
          const giftId = BigInt(idStr.replace(/^0x/, '') || '0')
          const cleanHex = secretHex.replace(/^0x/, '')
          const secretBytes = new Uint8Array(
            cleanHex.match(/.{1,2}/g)?.map((b) => parseInt(b, 16)) ?? [],
          )
          await sendOne(
            msgClaimLinkGift({
              claimer: initiaAddress,
              giftId,
              secret: secretBytes,
            }),
          )
          toast.success('Link gift claimed')
          return
        }

        case 'claim-directed-group-gift': {
          const idStr = record.values['Gift ID'] || ''
          const giftId = BigInt(idStr.replace(/^0x/, '') || '0')
          await sendOne(
            msgClaimDirectedGift({ claimer: initiaAddress, giftId }),
          )
          toast.success('Directed gift claimed')
          return
        }

        case 'reclaim-expired-gifts': {
          const idStr = record.values['Gift ID'] || ''
          const giftId = BigInt(idStr.replace(/^0x/, '') || '0')
          await sendOne(
            msgReclaimExpiredGift({ sender: initiaAddress, giftId }),
          )
          toast.success('Reclaimed expired gift')
          return
        }

        case 'register-gift-box': {
          const name = record.values['Template name'] || ''
          const themeJson = record.values['Theme JSON'] || '{}'
          const defaultAmt = record.values['Default amount'] || ''
          await sendOne(
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
          toast.success('Gift box template registered')
          return
        }

        // ----- subscriptions -----
        case 'register-plan': {
          const priceStr = record.values['Period price'] || ''
          const cadence = record.values['Billing cadence'] || ''
          const baseUnits = toBaseUnits(priceStr)
          if (baseUnits <= 0n) throw new Error('Price must be > 0')
          await sendOne(
            msgRegisterSubscriptionPlan({
              creator: initiaAddress,
              pricePerPeriod: baseUnits,
              periodSeconds: parsePeriodSeconds(cadence),
              denom: ORI_DENOM,
            }),
          )
          toast.success('Subscription plan registered')
          return
        }

        case 'subscribe-plan': {
          const creatorInput = record.values['Creator .init'] || ''
          const planIdStr = record.values['Plan ID'] || '1'
          const r = await resolve(creatorInput.trim())
          if (!r?.initiaAddress) throw new Error('Creator could not be resolved')
          const periods = BigInt(Number(planIdStr) || 1)
          await sendOne(
            msgSubscribe({
              subscriber: initiaAddress,
              creator: r.initiaAddress,
              periods,
            }),
          )
          toast.success('Subscribed')
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
          await sendOne(
            msgReleaseSubscriptionPeriod({
              caller: initiaAddress,
              subscriber: sub.initiaAddress,
              creator: creator.initiaAddress,
            }),
          )
          toast.success('Period released')
          return
        }

        case 'deactivate-plan': {
          await sendOne(
            msgDeactivateSubscriptionPlan({ creator: initiaAddress }),
          )
          toast.success('Plan deactivated')
          return
        }

        default:
          toast.message('Not wired', {
            description: `${record.title} has no handler yet.`,
          })
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
        {/* Balance card (STUB) */}
        <div
          className="relative border border-black/10 bg-black p-6 text-white lg:col-span-2"
          data-testid="money-balance-card"
        >
          <span
            className="absolute right-4 top-4 border border-white/40 bg-white/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white/80"
            data-testid="money-balance-chip"
          >
            Balance live soon
          </span>
          <p
            className="text-xs font-bold uppercase tracking-[0.2em] text-white/60"
            data-testid="money-balance-label"
          >
            Total wallet
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
            Prototype portfolio rolls up balances, paywalls, streams, tips, subscriptions, gifts, and sponsored gas readiness.
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

        {/* Agent daily cap (STUB) */}
        <div
          className="relative border border-black/10 bg-white p-6"
          data-testid="money-agent-budget-card"
        >
          <span
            className="absolute right-3 top-3 border border-black/20 bg-[#F5F5F5] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[#52525B]"
            data-testid="money-agent-budget-chip"
          >
            Coming soon
          </span>
          <Radio className="h-6 w-6 text-[#0022FF]" />
          <p
            className="mt-5 text-xs font-bold uppercase tracking-[0.2em] text-[#52525B]"
            data-testid="money-agent-budget-label"
          >
            Agent daily cap
          </p>
          <p className="mt-2 font-mono text-2xl font-black" data-testid="money-agent-budget-value">
            250 INIT
          </p>
          <Progress
            value={38}
            className="mt-5 h-2 rounded-none bg-black/10"
            data-testid="money-agent-budget-progress"
          />
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
          const isStub = STUB_TAB_IDS.has(tab.id)
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
                    {isStub && (
                      <span
                        className="border border-black/20 bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#52525B]"
                        data-testid={`money-tab-chip-${tab.id}`}
                      >
                        Coming soon
                      </span>
                    )}
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
          {recentAction.title} queued at {recentAction.time}
        </div>
      )}
      <ActionDialog
        action={modalAction}
        onClose={() => setModalAction(null)}
        onComplete={(record) => void handleComplete(record)}
      />
    </section>
  )
}
