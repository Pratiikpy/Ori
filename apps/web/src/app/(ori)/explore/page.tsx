'use client'

/**
 * Explore page — wired to real backend endpoints.
 *
 * Wiring map (per _protocol/TRIAGE.md → Explore):
 *   Discover grid     → useDiscoverRecent / useDiscoverTopCreators / useDiscoverRising
 *   Leaderboards tab  → useTopCreators / useTopTippers / useProfileTopTippers
 *   Oracle prices tab → useOraclePrices(['BTC/USD', 'ETH/USD', 'SOL/USD', 'BNB/USD', 'ATOM/USD'])
 *                       (React-Query refetchInterval handles "live"; no setInterval drift.)
 *   Activity tab      → useActivity(initiaAddress) for the connected profile feed.
 *   Squads tab        → 5 actions wired via custom dialog → useAutoSign → sendTx.
 *
 * Squads dialog choice: ActionDialog only fires a toast on submit and we can't
 * extend it without touching action-dialog.tsx (out of scope). Per task hint we
 * skip ActionDialog for squads and use a small in-file dialog that drives
 * useAutoSign + sendTx with the corresponding msg* helper. The other tabs do
 * not need ActionDialog at all on this page; we keep an <ActionDialog /> mount
 * at the bottom but feed it nothing — preserved only to honor the "keep mount"
 * constraint should a future squad action want to route through it.
 */
import { useCallback, useState } from 'react'
import Link from 'next/link'
import { useInterwovenKit } from '@initia/interwovenkit-react'
import { Activity, Compass, UsersRound, Check, X } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ActionCard,
  ActionDialog,
  type Action,
  type ActionRecord,
} from '@/components/action-dialog'
import {
  useDiscoverRecent,
  useDiscoverRising,
  useDiscoverTopCreators,
} from '@/hooks/use-discover'
import {
  useProfileTopTippers,
  useTopCreators,
  useTopTippers,
} from '@/hooks/use-leaderboards'
import { useOraclePrices } from '@/hooks/use-oracle'
import { useActivity } from '@/hooks/use-activity'
import { useAutoSign } from '@/hooks/use-auto-sign'
import { ORI_CHAIN_ID } from '@/lib/chain-config'
import {
  msgCreateSquad,
  msgDisbandSquad,
  msgJoinSquad,
  msgLeaveSquad,
  msgTransferSquadLeader,
} from '@/lib/contracts'
import { buildAutoSignFee, friendlyError, sendTx } from '@/lib/tx'
import {
  formatOraclePrice,
  type OraclePrice,
} from '@/lib/api-oracle'
import type { DiscoverEntry } from '@/lib/api-discover'
import type { LeaderEntry, ProfileTipperEntry } from '@/lib/api-leaderboards'
import type { ActivityEntry } from '@/lib/api-activity'

// ---------- discover labels (verbatim ids from reference) ----------
const DISCOVER_LABELS: Record<string, string> = {
  recent: 'Recent',
  topCreators: 'Top Creators',
  rising: 'Rising',
}

// ---------- squads ----------
type SquadActionId =
  | 'create-squad'
  | 'join-squad'
  | 'leave-squad'
  | 'disband-squad'
  | 'transfer-leadership'

type SquadAction = {
  id: SquadActionId
  title: string
  contract: string
  fields: string[]
}

const squadActions: SquadAction[] = [
  { id: 'create-squad', title: 'Create squad', contract: 'squads.move', fields: ['Squad name', 'Description'] },
  { id: 'join-squad', title: 'Join squad', contract: 'squads.move', fields: ['Squad ID', 'Invite code'] },
  { id: 'leave-squad', title: 'Leave squad', contract: 'squads.move', fields: ['Squad ID'] },
  { id: 'disband-squad', title: 'Disband squad', contract: 'squads.move', fields: ['Squad ID', 'Confirm phrase'] },
  { id: 'transfer-leadership', title: 'Transfer leadership', contract: 'squads.move', fields: ['Squad ID', 'New leader'] },
]

const ORACLE_PAIRS = ['BTC/USD', 'ETH/USD', 'SOL/USD', 'BNB/USD', 'ATOM/USD'] as const
const ORACLE_IDS = ['btc', 'eth', 'sol', 'bnb', 'atom'] as const

// ---------- helpers ----------
function entryLabel(entry: DiscoverEntry): string {
  return entry.initName ? `${entry.initName}.init` : `${entry.address.slice(0, 10)}...`
}

function leaderLabel(row: LeaderEntry | ProfileTipperEntry): string {
  return row.initName ? `${row.initName}.init` : `${row.address.slice(0, 10)}...`
}

function activityLabel(entry: ActivityEntry): string {
  const who = `${entry.counterparty.slice(0, 10)}...`
  if (entry.kind === 'tip') return `${entry.direction === 'given' ? 'Tipped' : 'Received tip from'} ${who}`
  if (entry.kind === 'payment') return `${entry.direction === 'sent' ? 'Paid' : 'Received payment from'} ${who}`
  return entry.direction === 'started_following' ? `Followed ${who}` : `${who} followed you`
}

// ---------- page ----------
export default function ExplorePage() {
  const kit = useInterwovenKit()
  const { initiaAddress, isConnected, openConnect } = kit
  const { isEnabled: autoSign } = useAutoSign()

  // Kept for ActionDialog mount compatibility; squads use their own modal.
  const [modalAction, setModalAction] = useState<Action | null>(null)
  const [recentAction, setRecentAction] = useState<ActionRecord | null>(null)

  // Squads modal state.
  const [squadModal, setSquadModal] = useState<SquadAction | null>(null)
  const [squadValues, setSquadValues] = useState<Record<string, string>>({})
  const [squadBusy, setSquadBusy] = useState(false)

  // Discover wiring.
  const recent = useDiscoverRecent(8)
  const topCreators = useDiscoverTopCreators(8)
  const rising = useDiscoverRising(8)

  // Leaderboards wiring.
  const lbCreators = useTopCreators(10)
  const lbTippers = useTopTippers(10)
  const lbProfileTippers = useProfileTopTippers(initiaAddress, 10)

  // Oracle wiring (React-Query refetchInterval — replaces setInterval drift).
  const oracle = useOraclePrices([...ORACLE_PAIRS])
  const activity = useActivity(initiaAddress, 12)

  const openSquadModal = useCallback((action: SquadAction) => {
    setSquadValues({})
    setSquadModal(action)
  }, [])

  const closeSquadModal = useCallback(() => {
    setSquadModal(null)
    setSquadValues({})
    setSquadBusy(false)
  }, [])

  const submitSquadAction = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!squadModal) return
      if (!isConnected) return openConnect()
      if (!initiaAddress) return

      setSquadBusy(true)
      try {
        let msg: ReturnType<typeof msgCreateSquad>
        let gas = 500_000

        switch (squadModal.id) {
          case 'create-squad': {
            const name = (squadValues['Squad name'] ?? '').trim()
            if (!name) {
              toast.error('Squad name is required')
              setSquadBusy(false)
              return
            }
            msg = msgCreateSquad({ leader: initiaAddress, name })
            gas = 500_000
            break
          }
          case 'join-squad': {
            const sid = (squadValues['Squad ID'] ?? '').trim().replace(/^#/, '')
            if (!/^\d+$/.test(sid)) {
              toast.error('Squad ID must be numeric')
              setSquadBusy(false)
              return
            }
            msg = msgJoinSquad({ member: initiaAddress, squadId: BigInt(sid) })
            gas = 400_000
            break
          }
          case 'leave-squad': {
            const sid = (squadValues['Squad ID'] ?? '').trim().replace(/^#/, '')
            if (!/^\d+$/.test(sid)) {
              toast.error('Squad ID must be numeric')
              setSquadBusy(false)
              return
            }
            msg = msgLeaveSquad({ member: initiaAddress, squadId: BigInt(sid) })
            gas = 400_000
            break
          }
          case 'disband-squad': {
            const sid = (squadValues['Squad ID'] ?? '').trim().replace(/^#/, '')
            if (!/^\d+$/.test(sid)) {
              toast.error('Squad ID must be numeric')
              setSquadBusy(false)
              return
            }
            msg = msgDisbandSquad({ leader: initiaAddress, squadId: BigInt(sid) })
            gas = 500_000
            break
          }
          case 'transfer-leadership': {
            const sid = (squadValues['Squad ID'] ?? '').trim().replace(/^#/, '')
            const newLeader = (squadValues['New leader'] ?? '').trim()
            if (!/^\d+$/.test(sid)) {
              toast.error('Squad ID must be numeric')
              setSquadBusy(false)
              return
            }
            if (!newLeader) {
              toast.error('New leader address is required')
              setSquadBusy(false)
              return
            }
            msg = msgTransferSquadLeader({
              leader: initiaAddress,
              squadId: BigInt(sid),
              newLeader,
            })
            gas = 500_000
            break
          }
          default: {
            setSquadBusy(false)
            return
          }
        }

        await sendTx(kit, {
          chainId: ORI_CHAIN_ID,
          messages: [msg],
          autoSign,
          fee: autoSign ? buildAutoSignFee(gas) : undefined,
        })
        toast.success(`${squadModal.title} submitted`)
        closeSquadModal()
      } catch (err) {
        toast.error(friendlyError(err))
        setSquadBusy(false)
      }
    },
    [
      squadModal,
      squadValues,
      isConnected,
      initiaAddress,
      kit,
      autoSign,
      openConnect,
      closeSquadModal,
    ],
  )

  // Discover sections — keyed iteration to preserve testid keys.
  const discoverSources: Array<{
    key: 'recent' | 'topCreators' | 'rising'
    query: typeof recent
  }> = [
    { key: 'recent', query: recent },
    { key: 'topCreators', query: topCreators },
    { key: 'rising', query: rising },
  ]

  return (
    <section className="p-4 sm:p-6 lg:p-8" data-testid="explore-page">
      <div
        className="grid grid-cols-1 gap-4 xl:grid-cols-3"
        data-testid="explore-discover-grid"
      >
        {discoverSources.map(({ key, query }) => {
          const items = (query.data ?? []) as DiscoverEntry[]
          return (
            <article
              key={key}
              className="border border-black/10 bg-white p-6"
              data-testid={`discover-card-${key}`}
            >
              <Compass className="h-6 w-6 text-[#0022FF]" />
              <h2
                className="mt-6 font-heading text-2xl font-black capitalize tracking-tight"
                data-testid={`discover-title-${key}`}
              >
                {DISCOVER_LABELS[key] ?? key}
              </h2>
              <div className="mt-5 space-y-3" data-testid={`discover-list-${key}`}>
                {query.isLoading ? (
                  <p className="font-mono text-xs text-[#52525B]">Loading…</p>
                ) : items.length === 0 ? (
                  <p className="font-mono text-xs text-[#52525B]">No entries yet.</p>
                ) : (
                  items.map((entry) => {
                    const label = entryLabel(entry)
                    return (
                      <Link
                        key={entry.address}
                        href={`/profile/${entry.address}`}
                        className="block w-full rounded-none border border-black/10 px-3 py-3 text-left text-sm hover:bg-black hover:text-white"
                        data-testid={`discover-item-${key}-${entry.address.slice(0, 10).toLowerCase()}`}
                      >
                        {label}
                      </Link>
                    )
                  })
                )}
              </div>
            </article>
          )
        })}
      </div>

      <Tabs defaultValue="leaderboards" className="mt-8" data-testid="explore-tabs">
        <TabsList
          className="flex h-auto flex-wrap justify-start rounded-none border border-black/10 bg-white p-0"
          data-testid="explore-tabs-list"
        >
          <TabsTrigger
            value="leaderboards"
            className="rounded-none border-r border-black/10 px-4 py-3 data-[state=active]:bg-[#0022FF] data-[state=active]:text-white"
            data-testid="explore-tab-leaderboards"
          >
            Leaderboards
          </TabsTrigger>
          <TabsTrigger
            value="oracle"
            className="rounded-none border-r border-black/10 px-4 py-3 data-[state=active]:bg-[#0022FF] data-[state=active]:text-white"
            data-testid="explore-tab-oracle"
          >
            Oracle prices
          </TabsTrigger>
          <TabsTrigger
            value="activity"
            className="rounded-none border-r border-black/10 px-4 py-3 data-[state=active]:bg-[#0022FF] data-[state=active]:text-white"
            data-testid="explore-tab-activity"
          >
            Activity
          </TabsTrigger>
          <TabsTrigger
            value="squads"
            className="rounded-none px-4 py-3 data-[state=active]:bg-[#0022FF] data-[state=active]:text-white"
            data-testid="explore-tab-squads"
          >
            Squads
          </TabsTrigger>
        </TabsList>

        {/* ---------------- LEADERBOARDS ---------------- */}
        <TabsContent
          value="leaderboards"
          className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3"
          data-testid="leaderboards-content"
        >
          {/* Top creators */}
          <article
            className="border border-black/10 bg-white p-6"
            data-testid="leaderboard-creators"
          >
            <h2
              className="font-heading text-2xl font-black tracking-tight"
              data-testid="leaderboard-title-creators"
            >
              Top creators
            </h2>
            <ol className="mt-5 space-y-3">
              {lbCreators.isLoading ? (
                <li className="font-mono text-sm text-[#52525B]">Loading…</li>
              ) : (lbCreators.data ?? []).length === 0 ? (
                <li className="font-mono text-sm text-[#52525B]">No entries yet.</li>
              ) : (
                (lbCreators.data ?? []).map((row, index) => (
                  <li
                    key={row.address}
                    className="font-mono text-sm"
                    data-testid={`leaderboard-row-creators-${index}`}
                  >
                    {index + 1}.{' '}
                    <Link
                      href={`/profile/${row.address}`}
                      className="text-[#0022FF] hover:underline"
                    >
                      {leaderLabel(row)}
                    </Link>
                    {row.tipsReceived !== undefined ? ` — ${row.tipsReceived} tips` : ''}
                  </li>
                ))
              )}
            </ol>
          </article>

          {/* Top tippers */}
          <article
            className="border border-black/10 bg-white p-6"
            data-testid="leaderboard-tippers"
          >
            <h2
              className="font-heading text-2xl font-black tracking-tight"
              data-testid="leaderboard-title-tippers"
            >
              Top tippers
            </h2>
            <ol className="mt-5 space-y-3">
              {lbTippers.isLoading ? (
                <li className="font-mono text-sm text-[#52525B]">Loading…</li>
              ) : (lbTippers.data ?? []).length === 0 ? (
                <li className="font-mono text-sm text-[#52525B]">No entries yet.</li>
              ) : (
                (lbTippers.data ?? []).map((row, index) => (
                  <li
                    key={row.address}
                    className="font-mono text-sm"
                    data-testid={`leaderboard-row-tippers-${index}`}
                  >
                    {index + 1}.{' '}
                    <Link
                      href={`/profile/${row.address}`}
                      className="text-[#0022FF] hover:underline"
                    >
                      {leaderLabel(row)}
                    </Link>
                    {row.tipsGiven !== undefined ? ` — ${row.tipsGiven} tips` : ''}
                  </li>
                ))
              )}
            </ol>
          </article>

          {/* Per-profile creator-tippers */}
          <article
            className="border border-black/10 bg-white p-6"
            data-testid="leaderboard-creator-tippers"
          >
            <h2
              className="font-heading text-2xl font-black tracking-tight"
              data-testid="leaderboard-title-creator-tippers"
            >
              Your top supporters
            </h2>
            <ol className="mt-5 space-y-3">
              {!initiaAddress ? (
                <li
                  className="font-mono text-sm text-[#52525B]"
                  data-testid="leaderboard-creator-tippers-empty"
                >
                  Connect wallet to see your supporters
                </li>
              ) : lbProfileTippers.isLoading ? (
                <li className="font-mono text-sm text-[#52525B]">Loading…</li>
              ) : (lbProfileTippers.data ?? []).length === 0 ? (
                <li className="font-mono text-sm text-[#52525B]">No entries yet.</li>
              ) : (
                (lbProfileTippers.data ?? []).map((row, index) => (
                  <li
                    key={row.address}
                    className="font-mono text-sm"
                    data-testid={`leaderboard-row-creator-tippers-${index}`}
                  >
                    {index + 1}.{' '}
                    <Link
                      href={`/profile/${row.address}`}
                      className="text-[#0022FF] hover:underline"
                    >
                      {leaderLabel(row)}
                    </Link>{' '}
                    — {row.tipCount} tips
                  </li>
                ))
              )}
            </ol>
          </article>
        </TabsContent>

        {/* ---------------- ORACLE PRICES ---------------- */}
        <TabsContent
          value="oracle"
          className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5"
          data-testid="oracle-content"
        >
          {ORACLE_PAIRS.map((pair, index) => {
            const id = ORACLE_IDS[index]
            const slot = oracle[index]
            const data: OraclePrice | undefined = slot?.data
            const isLoading = slot?.isLoading ?? false
            const isError = slot?.isError ?? false
            return (
              <article
                key={id}
                className="border border-black/10 bg-white p-5"
                data-testid={`oracle-card-${id}`}
              >
                <p
                  className="font-mono text-xs text-[#52525B]"
                  data-testid={`oracle-pair-${id}`}
                >
                  {pair} · Slinky live
                </p>
                <p
                  className="mt-4 font-mono text-2xl font-black"
                  data-testid={`oracle-price-${id}`}
                >
                  {isLoading ? (
                    <span className="inline-block h-7 w-24 animate-pulse bg-black/5" />
                  ) : isError || !data ? (
                    '—'
                  ) : (
                    formatOraclePrice(data)
                  )}
                </p>
                <p
                  className="mt-2 font-mono text-sm text-[#52525B]"
                  data-testid={`oracle-move-${id}`}
                >
                  {data?.blockHeight ? `block ${data.blockHeight}` : '—'}
                </p>
              </article>
            )
          })}
        </TabsContent>

        {/* ---------------- ACTIVITY ---------------- */}
        <TabsContent
          value="activity"
          className="mt-4 border border-black/10 bg-white p-6"
          data-testid="activity-content"
        >
          <div
            className="mb-4 flex items-center justify-between"
            data-testid="activity-header"
          >
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#52525B]">
              Your activity feed
            </p>
          </div>
          {!initiaAddress ? (
            <p className="text-sm text-[#52525B]" data-testid="activity-disconnected">
              Connect wallet to load your activity.
            </p>
          ) : activity.isLoading ? (
            <p className="font-mono text-sm text-[#52525B]" data-testid="activity-loading">Loading…</p>
          ) : (activity.data?.entries ?? []).length === 0 ? (
            <p className="font-mono text-sm text-[#52525B]" data-testid="activity-empty">No activity yet.</p>
          ) : (
            (activity.data?.entries ?? []).map((item, index) => (
              <div
                key={item.id}
                className="flex items-center gap-4 border-b border-black/10 py-4 last:border-b-0"
                data-testid={`activity-row-${index}`}
              >
                <Activity className="h-4 w-4 text-[#0022FF]" />
                <div>
                  <p className="text-sm font-semibold" data-testid={`activity-text-${index}`}>
                    {activityLabel(item)}
                  </p>
                  <p className="mt-1 font-mono text-xs text-[#52525B]" data-testid={`activity-time-${index}`}>
                    {new Date(item.at).toLocaleString()}
                  </p>
                </div>
              </div>
            ))
          )}
        </TabsContent>

        {/* ---------------- SQUADS ---------------- */}
        <TabsContent value="squads" className="mt-4" data-testid="squads-content">
          <div
            className="mb-4 flex items-center gap-3 border border-black/10 bg-[#F5F5F5] p-5"
            data-testid="squad-summary-card"
          >
            <UsersRound className="h-5 w-5 text-[#0022FF]" />
            <span data-testid="squad-summary-text">
              Create groups, join crews, leave safely, disband, or transfer leadership.
            </span>
          </div>
          <div
            className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
            data-testid="squad-actions-grid"
          >
            {squadActions.map((action) => (
              <ActionCard
                key={action.id}
                scope="squads"
                action={action}
                onOpen={() => openSquadModal(action)}
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {recentAction && (
        <p
          className="mt-6 font-mono text-sm text-[#0022FF]"
          data-testid="explore-recent-action"
        >
          {recentAction.title} submitted.
        </p>
      )}

      {/* ActionDialog mount kept per task spec; squads use their own dialog below. */}
      <ActionDialog
        action={modalAction}
        onClose={() => setModalAction(null)}
        onComplete={setRecentAction}
      />

      {/* Squads-specific dialog — wires real msg* helpers via useAutoSign + sendTx. */}
      {squadModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A0A0A]/70 px-4"
          data-testid={`squad-modal-${squadModal.id}`}
        >
          <form
            onSubmit={submitSquadAction}
            className="w-full max-w-xl border border-[#0A0A0A] bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,34,255,1)]"
            data-testid={`squad-form-${squadModal.id}`}
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-xs uppercase text-[#52525B]">
                  {squadModal.contract}
                </p>
                <h2 className="mt-2 font-heading text-2xl font-black tracking-tight">
                  {squadModal.title}
                </h2>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={closeSquadModal}
                className="rounded-none hover:bg-black hover:text-white"
                aria-label="Close action dialog"
                data-testid={`squad-modal-close-${squadModal.id}`}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4">
              {squadModal.fields.map((field, index) => {
                const id = `${squadModal.id}-${field
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, '-')}`
                return (
                  <label key={field} className="block" htmlFor={id}>
                    <span className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-[#52525B]">
                      {field}
                    </span>
                    <Input
                      id={id}
                      required={index === 0}
                      value={squadValues[field] ?? ''}
                      onChange={(event) =>
                        setSquadValues((prev) => ({
                          ...prev,
                          [field]: event.target.value,
                        }))
                      }
                      className="rounded-none border-black/20 focus-visible:ring-[#0022FF]"
                      placeholder={`Enter ${field.toLowerCase()}`}
                      data-testid={`squad-input-${id}`}
                    />
                  </label>
                )
              })}
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={closeSquadModal}
                className="rounded-none border-black hover:bg-black hover:text-white"
                data-testid={`squad-modal-cancel-${squadModal.id}`}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={squadBusy}
                className="rounded-none bg-[#0022FF] hover:bg-[#0019CC]"
                data-testid={`squad-modal-submit-${squadModal.id}`}
              >
                <Check className="h-4 w-4" /> {squadBusy ? 'Signing…' : 'Submit tx'}
              </Button>
            </div>
          </form>
        </div>
      )}
    </section>
  )
}
