'use client'

/**
 * /profile/[address] — read-only view of another user's profile.
 *
 * The self-profile page (/profile) handles editing, agent-policy txs, and
 * settings. This page is purely for viewing somebody else: their identity,
 * trust score, follows, badges, and a Tip / Follow / Send Payment / Message
 * action row. If the URL params resolve to the connected wallet's own
 * address, we redirect to /profile so the editing UI takes over.
 *
 * Why a separate page instead of branching in /profile/page.tsx: the self
 * page is 983 lines of strictly-self logic (Move tx forms, settings, agent
 * policy slider tied to env vars). Forking those branches by `isSelf`
 * doubles the surface area; a focused read-only page is simpler and safer.
 */
import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Heart, MessageSquare, Send, Sparkles, UserPlus, UserMinus } from 'lucide-react'
import { useInterwovenKit } from '@initia/interwovenkit-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { CopyButton } from '@/components/copy-button'
import { useProfile, useBadges } from '@/hooks/use-profile'
import { useFollowStats, useFollowers, useFollowing } from '@/hooks/use-follows'
import { useTrustScore } from '@/hooks/use-trust-score'
import { useActivity } from '@/hooks/use-activity'
import { msgFollow, msgUnfollow, msgSendPayment, msgTip } from '@/lib/contracts'
import { sendTx, extractTxHash, txExplorerUrl, friendlyTxError } from '@/lib/tx'
import { ORI_CHAIN_ID, ORI_DENOM, ORI_DECIMALS } from '@/lib/chain-config'
import { deriveChatId } from '@/lib/crypto'

function shortenAddress(a: string | null | undefined): string {
  if (!a) return '—'
  if (a.length <= 16) return a
  return `${a.slice(0, 8)}…${a.slice(-4)}`
}

function parseAmountToUmin(raw: string): bigint {
  const trimmed = raw.trim()
  if (!trimmed) throw new Error('Enter an amount')
  const n = Number(trimmed)
  if (!Number.isFinite(n) || n <= 0) throw new Error('Enter a positive amount')
  return BigInt(Math.round(n * 10 ** ORI_DECIMALS))
}

export default function OtherProfilePage() {
  const params = useParams<{ address: string }>()
  const router = useRouter()
  const targetAddress = (params?.address ?? '').toString()
  const kit = useInterwovenKit() as ReturnType<typeof useInterwovenKit> & {
    initiaAddress: string
    isConnected: boolean
  }
  const { initiaAddress, isConnected } = kit
  const isSelf = isConnected && initiaAddress === targetAddress

  // Redirect a self-visit to the editable /profile page. Has to live in a
  // useEffect, not the render body — Next warns when router.replace fires
  // during render and the redirect can race with the data hooks below.
  useEffect(() => {
    if (isSelf) router.replace('/profile')
  }, [isSelf, router])

  const profile = useProfile(targetAddress)
  const followStats = useFollowStats(targetAddress)
  const trust = useTrustScore(targetAddress)
  const badges = useBadges(targetAddress)
  const activity = useActivity(targetAddress)
  const myFollowing = useFollowing(initiaAddress ?? null)
  const followers = useFollowers(targetAddress)

  const isFollowing = useMemo<boolean>(() => {
    const list = myFollowing.data ?? []
    return list.some((f) => f.address === targetAddress)
  }, [myFollowing.data, targetAddress])

  const [busy, setBusy] = useState(false)
  const [tipAmount, setTipAmount] = useState('1')
  const [payAmount, setPayAmount] = useState('1')
  const [payMemo, setPayMemo] = useState('')

  async function broadcast(label: string, msg: ReturnType<typeof msgFollow>): Promise<void> {
    if (!isConnected) {
      toast.error('Connect wallet first')
      return
    }
    setBusy(true)
    try {
      const res = await sendTx(kit, {
        chainId: ORI_CHAIN_ID,
        messages: [msg],
        autoSign: false,
      })
      const hash = extractTxHash(res.rawResponse)
      const url = hash ? txExplorerUrl(hash) : null
      toast.success(`${label} ✓`, {
        description: hash ? `Tx ${hash.slice(0, 10)}…` : undefined,
        action: url
          ? { label: 'View tx', onClick: () => window.open(url, '_blank') }
          : undefined,
      })
    } catch (err) {
      toast.error(`${label} failed`, { description: friendlyTxError(err) })
    } finally {
      setBusy(false)
    }
  }

  async function onMessage(): Promise<void> {
    if (!initiaAddress) {
      toast.error('Connect wallet first')
      return
    }
    try {
      const id = await deriveChatId(initiaAddress, targetAddress)
      router.push(`/inbox?chat=${id}`)
    } catch {
      toast.error('Could not open chat')
    }
  }

  if (!targetAddress.startsWith('init1')) {
    return (
      <section className="mx-auto max-w-3xl p-8">
        <h1 className="font-heading text-3xl font-black">Invalid address</h1>
        <p className="mt-3 text-sm text-[#52525B]">
          That doesn't look like a bech32 init1… address.
        </p>
        <Link href="/explore" className="mt-6 inline-block text-[#0022FF] underline">
          ← Back to Explore
        </Link>
      </section>
    )
  }

  const handle = profile.data?.initName
    ? `${profile.data.initName}.init`
    : shortenAddress(targetAddress)

  return (
    <section className="grid min-h-[calc(100vh-90px)] grid-cols-1 gap-6 p-6 lg:grid-cols-[1fr_360px]">
      {/* Main column */}
      <div className="space-y-5">
        <header className="border border-black/10 bg-white p-6">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#52525B]">
            Profile
          </p>
          <h1 className="mt-2 font-heading text-4xl font-black tracking-tight">
            {handle}
          </h1>
          <div className="mt-1 flex items-center gap-2">
            <p className="break-all font-mono text-xs text-[#52525B]">
              {targetAddress}
            </p>
            <CopyButton value={targetAddress} label="Copy address" />
          </div>

          {profile.data?.bio && (
            <p className="mt-4 text-sm leading-6">{profile.data.bio}</p>
          )}

          <div className="mt-5 flex flex-wrap gap-2">
            {!isConnected ? (
              <p className="text-sm text-[#52525B]">
                Connect wallet to follow, tip, message, or pay.
              </p>
            ) : (
              <>
                <Button
                  onClick={onMessage}
                  className="rounded-none bg-[#0022FF] hover:bg-[#0019CC]"
                  data-testid="profile-action-message"
                >
                  <MessageSquare className="mr-2 h-4 w-4" /> Message
                </Button>
                <Button
                  onClick={() =>
                    void broadcast(
                      isFollowing ? 'Unfollowed' : 'Followed',
                      isFollowing
                        ? msgUnfollow({ follower: initiaAddress, target: targetAddress })
                        : msgFollow({ follower: initiaAddress, target: targetAddress }),
                    )
                  }
                  disabled={busy}
                  variant="outline"
                  className="rounded-none border-black/15"
                  data-testid="profile-action-follow"
                >
                  {isFollowing ? (
                    <>
                      <UserMinus className="mr-2 h-4 w-4" /> Unfollow
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-4 w-4" /> Follow
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </header>

        {/* Tip + Send payment compact composers */}
        {isConnected && (
          <div className="grid gap-4 md:grid-cols-2">
            <article
              className="border border-black/10 bg-white p-5"
              data-testid="profile-tip-card"
            >
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#52525B]">
                Tip
              </p>
              <h2 className="mt-1 font-heading text-xl font-black">
                Drop them some INIT
              </h2>
              <div className="mt-3 flex gap-2">
                <input
                  value={tipAmount}
                  onChange={(e) => setTipAmount(e.target.value)}
                  className="w-full rounded-none border border-black/15 px-3 py-2 font-mono text-sm"
                  placeholder="1"
                  data-testid="profile-tip-amount"
                />
                <Button
                  onClick={() => {
                    try {
                      const amount = parseAmountToUmin(tipAmount)
                      void broadcast(
                        'Tip sent',
                        msgTip({
                          sender: initiaAddress,
                          creator: targetAddress,
                          amount,
                          message: '',
                        }),
                      )
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : 'Bad amount')
                    }
                  }}
                  disabled={busy}
                  className="rounded-none bg-[#0022FF] hover:bg-[#0019CC]"
                  data-testid="profile-tip-submit"
                >
                  <Sparkles className="mr-2 h-4 w-4" /> Tip
                </Button>
              </div>
            </article>

            <article
              className="border border-black/10 bg-white p-5"
              data-testid="profile-pay-card"
            >
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#52525B]">
                Send payment
              </p>
              <h2 className="mt-1 font-heading text-xl font-black">Pay them</h2>
              <div className="mt-3 grid gap-2">
                <input
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="rounded-none border border-black/15 px-3 py-2 font-mono text-sm"
                  placeholder="Amount in INIT"
                  data-testid="profile-pay-amount"
                />
                <input
                  value={payMemo}
                  onChange={(e) => setPayMemo(e.target.value)}
                  className="rounded-none border border-black/15 px-3 py-2 text-sm"
                  placeholder="Memo (optional)"
                  data-testid="profile-pay-memo"
                />
                <Button
                  onClick={() => {
                    try {
                      const amount = parseAmountToUmin(payAmount)
                      void broadcast(
                        'Payment sent',
                        msgSendPayment({
                          sender: initiaAddress,
                          recipient: targetAddress,
                          amount,
                          memo: payMemo,
                          chatId: '',
                          denom: ORI_DENOM,
                        }),
                      )
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : 'Bad amount')
                    }
                  }}
                  disabled={busy}
                  className="rounded-none bg-[#0022FF] hover:bg-[#0019CC]"
                  data-testid="profile-pay-submit"
                >
                  <Send className="mr-2 h-4 w-4" /> Send
                </Button>
              </div>
            </article>
          </div>
        )}

        {/* Activity */}
        <article
          className="border border-black/10 bg-white p-6"
          data-testid="profile-activity"
        >
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#52525B]">
            Recent activity
          </p>
          <h2 className="mt-1 font-heading text-2xl font-black">On-chain feed</h2>
          <ul className="mt-4 space-y-3 font-mono text-sm">
            {activity.isLoading && <li className="text-[#52525B]">Loading…</li>}
            {!activity.isLoading && (activity.data?.entries ?? []).length === 0 && (
              <li className="text-[#52525B]">No public activity yet.</li>
            )}
            {(activity.data?.entries ?? []).slice(0, 12).map((e, i) => (
              <li
                key={i}
                className="border-b border-black/5 pb-2 last:border-b-0"
                data-testid={`profile-activity-row-${i}`}
              >
                <span className="text-[#0022FF]">{e.kind}</span> ·{' '}
                <span className="text-[#52525B]">
                  {new Date(e.at).toLocaleString([], {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </li>
            ))}
          </ul>
        </article>
      </div>

      {/* Side column */}
      <div className="space-y-4">
        <article
          className="border border-black/10 bg-white p-5"
          data-testid="profile-stats"
        >
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#52525B]">
            Stats
          </p>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-xs text-[#52525B]">Trust</dt>
              <dd className="font-heading text-xl font-black" data-testid="profile-trust">
                {trust.data ? `${trust.data.score}/${trust.data.maxScore}` : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[#52525B]">Followers</dt>
              <dd
                className="font-heading text-xl font-black"
                data-testid="profile-followers"
              >
                {followStats.data?.followers ?? '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[#52525B]">Following</dt>
              <dd
                className="font-heading text-xl font-black"
                data-testid="profile-following"
              >
                {followStats.data?.following ?? '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[#52525B]">Badges</dt>
              <dd className="font-heading text-xl font-black">
                {badges.data?.length ?? 0}
              </dd>
            </div>
          </dl>
        </article>

        <article
          className="border border-black/10 bg-white p-5"
          data-testid="profile-followers-list"
        >
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#52525B]">
            Recent followers
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            {(followers.data ?? []).slice(0, 6).map((f) => (
              <li key={f.address} className="font-mono text-xs">
                <Link
                  href={`/profile/${f.address}`}
                  className="text-[#0022FF] hover:underline"
                >
                  <Heart className="mr-1 inline h-3 w-3" />
                  {f.initName ? `${f.initName}.init` : shortenAddress(f.address)}
                </Link>
              </li>
            ))}
            {(followers.data ?? []).length === 0 && (
              <li className="font-mono text-xs text-[#52525B]">No followers yet.</li>
            )}
          </ul>
        </article>

        <Link
          href="/explore"
          className="inline-block text-sm text-[#52525B] underline hover:text-black"
        >
          ← Back to Explore
        </Link>
      </div>
    </section>
  )
}
