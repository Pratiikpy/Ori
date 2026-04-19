'use client'

import { useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { Copy, ExternalLink, MessageCircle, QrCode } from 'lucide-react'
import { useInterwovenKit } from '@initia/interwovenkit-react'
import { toast } from 'sonner'

import { AppShell } from '@/components/app-shell'
import { TipJar } from '@/components/tip-jar'
import { QrModal } from '@/components/qr-modal'
import { BadgeRow } from '@/components/badge-row'
import { FollowButton } from '@/components/follow-button'
import { FollowStats } from '@/components/follow-stats'
import { TipLeaderboard } from '@/components/tip-leaderboard'
import { TrustScore } from '@/components/trust-score'
import { ActivityFeed } from '@/components/activity-feed'
import { useResolve } from '@/hooks/use-resolve'
import { getProfile, type ProfileData } from '@/lib/api'

export default function ProfilePage() {
  const { identifier } = useParams<{ identifier: string }>()
  const decoded = useMemo(() => decodeURIComponent(identifier ?? ''), [identifier])
  const router = useRouter()
  const { initiaAddress } = useInterwovenKit()

  // Ignore if this looks like a reserved route (shouldn't happen with App Router
  // but guard anyway so /chats etc. never fall through to here).
  const isReserved = [
    'chats', 'chat', 'onboard', 'gift', 'send', 'claim', 'obs', 'api', 'address',
    'settings', 'discover', 'portfolio', 'quests', 'paywall',
  ].includes(decoded)

  const { data: resolved, isLoading: resolving, error: resolveErr } = useResolve(
    isReserved ? null : decoded,
  )
  const { data: profile, isLoading: profileLoading } = useQuery<ProfileData>({
    queryKey: ['profile', resolved?.initiaAddress],
    queryFn: () => getProfile(resolved!.initiaAddress),
    enabled: Boolean(resolved?.initiaAddress),
    staleTime: 30_000,
  })

  if (isReserved) {
    // Fall back to home — shouldn't be reachable.
    router.replace('/')
    return null
  }

  const displayName = resolved?.initName ?? decoded
  const isSelf = initiaAddress === resolved?.initiaAddress

  const [qrOpen, setQrOpen] = useState(false)

  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined' || !resolved) return ''
    return `${window.location.origin}/${encodeURIComponent(resolved.initName ?? resolved.initiaAddress)}`
  }, [resolved])

  return (
    <AppShell title={displayName}>
      <div className="max-w-md mx-auto w-full px-4 py-5">
        <div className="flex items-center gap-4">
          <Avatar seed={resolved?.initiaAddress ?? decoded} />
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold truncate">{displayName}</h1>
            {resolved && (
              <div className="mt-1 flex items-center gap-2 text-xs font-mono text-muted-foreground">
                <span className="truncate">
                  {resolved.initiaAddress.slice(0, 14)}…{resolved.initiaAddress.slice(-6)}
                </span>
                <button
                  aria-label="Copy address"
                  onClick={() => {
                    void navigator.clipboard.writeText(resolved.initiaAddress)
                    toast.success('Copied')
                  }}
                  className="p-1 rounded hover:bg-muted"
                >
                  <Copy className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </div>

        {resolving && <div className="mt-4 text-muted-foreground">Resolving on L1…</div>}
        {resolveErr && <div className="mt-4 text-danger">{String(resolveErr.message ?? resolveErr)}</div>}

        {resolved && (
          <>
            <div className="mt-3">
              <FollowStats address={resolved.initiaAddress} />
            </div>

            <div className="mt-4 grid grid-cols-4 gap-2">
              <Link
                href={`/chat/${encodeURIComponent(resolved.initName ?? resolved.initiaAddress)}`}
                className="rounded-xl bg-muted border border-border py-2 inline-flex items-center justify-center gap-1.5 text-xs"
              >
                <MessageCircle className="w-4 h-4" />
                Message
              </Link>
              <Link
                href={`/send?to=${encodeURIComponent(resolved.initiaAddress)}`}
                className="rounded-xl bg-muted border border-border py-2 text-xs text-center"
              >
                Send
              </Link>
              <button
                onClick={() => setQrOpen(true)}
                className="rounded-xl bg-muted border border-border py-2 inline-flex items-center justify-center gap-1.5 text-xs hover:border-primary/50 transition"
              >
                <QrCode className="w-4 h-4" />
                Share
              </button>
              {!isSelf ? (
                <FollowButton
                  target={resolved.initiaAddress}
                  targetDisplayName={displayName}
                  className="rounded-xl py-2 text-xs"
                />
              ) : (
                <Link
                  href="/portfolio"
                  className="rounded-xl bg-muted border border-border py-2 text-xs text-center"
                >
                  Portfolio
                </Link>
              )}
            </div>

            {profile && profile.bio && <p className="mt-5 text-sm">{profile.bio}</p>}

            {profile && profile.links.length > 0 && (
              <ul className="mt-5 space-y-2">
                {profile.links.map((l, i) => (
                  <li key={i}>
                    <a
                      href={l.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="flex items-center justify-between rounded-xl border border-border bg-muted/40 px-4 py-3 hover:bg-muted transition"
                    >
                      <span className="text-sm font-medium">{l.label}</span>
                      <ExternalLink className="w-4 h-4 text-muted-foreground" />
                    </a>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-6">
              <TrustScore address={resolved.initiaAddress} />
            </div>

            <div className="mt-4">
              <BadgeRow address={resolved.initiaAddress} showLocked={isSelf} />
            </div>

            <div className="mt-4">
              <TipLeaderboard creatorAddress={resolved.initiaAddress} isSelf={isSelf} />
            </div>

            {!isSelf && (
              <div className="mt-4">
                <TipJar
                  creatorAddress={resolved.initiaAddress}
                  creatorDisplayName={resolved.initName ?? 'this creator'}
                />
              </div>
            )}

            <div className="mt-4">
              <ActivityFeed address={resolved.initiaAddress} />
            </div>

            {isSelf && (
              <div className="mt-6 rounded-2xl border border-border bg-muted/40 p-4">
                <div className="font-semibold text-sm">Creator tools</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  OBS browser source:
                </p>
                <code className="mt-2 block text-[11px] break-all font-mono text-muted-foreground bg-background rounded-lg px-2 py-2 border border-border">
                  {typeof window !== 'undefined'
                    ? `${window.location.origin}/obs/${encodeURIComponent(resolved.initName ?? resolved.initiaAddress)}`
                    : ''}
                </code>
              </div>
            )}
          </>
        )}

        {profileLoading && <div className="mt-4 text-muted-foreground">Loading profile…</div>}
      </div>

      <QrModal
        open={qrOpen && Boolean(resolved)}
        onClose={() => setQrOpen(false)}
        title={`Pay ${displayName}`}
        subtitle="Any camera can scan this to open the link"
        url={shareUrl}
      />
    </AppShell>
  )
}

function Avatar({ seed }: { seed: string }) {
  const hash = Array.from(seed).reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 0)
  const hue1 = hash % 360
  const hue2 = (hue1 + 60) % 360
  return (
    <div
      className="w-16 h-16 rounded-2xl flex-none"
      style={{
        background: `linear-gradient(135deg, hsl(${hue1} 60% 50%), hsl(${hue2} 60% 40%))`,
      }}
      aria-hidden
    />
  )
}
