'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useInterwovenKit } from '@initia/interwovenkit-react'
import { toast } from 'sonner'
import { CheckCircle2, ExternalLink, Loader2 } from 'lucide-react'

import { AppShell } from '@/components/app-shell'
import { BridgeButton } from '@/components/bridge-button'
import { PageHeader, Serif } from '@/components/page-header'
import { useSession } from '@/hooks/use-session'
import { useSignChallenge } from '@/hooks/use-sign-challenge'
import {
  cachePublicKey,
  deriveKeypair,
  getCachedPublicKey,
  KEY_DERIVATION_MESSAGE,
  type Keypair,
} from '@/lib/keystore'
import { msgCreateProfile, msgSetEncryptionPubkey } from '@/lib/contracts'
import { publishEncryptionPubkey } from '@/lib/api'
import { toBase64 } from '@/lib/crypto'
import { L1_USERNAMES_PORTAL_URL, ORI_CHAIN_ID } from '@/lib/chain-config'
import { buildAutoSignFee, sendTx } from '@/lib/tx'
import { useAutoSign } from '@/hooks/use-auto-sign'
import { reverseResolve } from '@/lib/resolve'
import { useClaimSeed, useClaimUsernameSponsorship, useSponsorStatus } from '@/hooks/use-sponsor'

type Stage =
  | 'connect'
  | 'signin'
  | 'claim-init'
  | 'derive-keys'
  | 'publish-pubkey'
  | 'create-profile'
  | 'done'

const INIT_POLL_INTERVAL_MS = 4_000

export default function OnboardPage() {
  const router = useRouter()
  const kit = useInterwovenKit()
  const { initiaAddress, hexAddress, isConnected, openConnect, username } = kit
  const { isEnabled: autoSign } = useAutoSign()
  const { status: sessionStatus, isAuthenticated, signIn, isSigning, error: sessionError } =
    useSession()
  const { sign } = useSignChallenge()

  const [stage, setStage] = useState<Stage>('connect')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [bio, setBio] = useState('')
  const [derivedKeypair, setDerivedKeypair] = useState<Keypair | null>(null)
  const [hasInitName, setHasInitName] = useState<boolean | null>(null)
  const [seedTried, setSeedTried] = useState(false)

  const { data: sponsorStatus } = useSponsorStatus()
  const claimSeed = useClaimSeed()
  const claimUsername = useClaimUsernameSponsorship()

  // B4: auto-fire one seed payment right after the user authenticates,
  // before they hit any on-chain step. Silent — failures are fine (they can
  // still bridge). We only try once per page load; the server also enforces
  // a 24h per-IP cooldown so repeated visits no-op anyway.
  useEffect(() => {
    if (seedTried) return
    if (!isAuthenticated || !initiaAddress) return
    if (!sponsorStatus?.enabled) return
    if (sponsorStatus.seedAmountUmin === 0) return
    setSeedTried(true)
    claimSeed.mutate(initiaAddress, {
      onSuccess: (r) => {
        if (r.txHash) toast.success('Gas sponsored — your first send is on us.')
      },
      onError: () => {
        // Silent: a 429 (budget/cooldown) isn't something the user needs to see.
      },
    })
  }, [isAuthenticated, initiaAddress, sponsorStatus, seedTried, claimSeed])

  useEffect(() => {
    if (!initiaAddress) {
      setHasInitName(null)
      return
    }
    let cancelled = false
    const tick = async () => {
      if (username) {
        if (!cancelled) setHasInitName(true)
        return
      }
      try {
        const name = await reverseResolve(initiaAddress)
        if (cancelled) return
        setHasInitName(Boolean(name))
      } catch {
        if (!cancelled) setHasInitName(false)
      }
    }
    void tick()
    const interval = setInterval(() => {
      if (stage === 'claim-init') void tick()
    }, INIT_POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [initiaAddress, username, stage])

  useEffect(() => {
    let cancelled = false
    async function compute() {
      if (!isConnected) {
        setStage('connect')
        return
      }
      if (!isAuthenticated) {
        setStage('signin')
        return
      }
      if (hasInitName === null) return
      if (hasInitName === false) {
        setStage('claim-init')
        return
      }
      if (!hexAddress) return
      const cached = await getCachedPublicKey(hexAddress)
      if (cancelled) return
      if (!cached) {
        setStage('derive-keys')
        return
      }
      setStage((prev) => (prev === 'done' ? prev : 'publish-pubkey'))
    }
    void compute()
    return () => {
      cancelled = true
    }
  }, [isConnected, isAuthenticated, hexAddress, hasInitName])

  const handleSignIn = async () => {
    setError(null)
    setBusy(true)
    try {
      await signIn()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign-in failed')
    } finally {
      setBusy(false)
    }
  }

  const handleDeriveKeys = async () => {
    if (!hexAddress) return
    setError(null)
    setBusy(true)
    try {
      const signature = await sign(KEY_DERIVATION_MESSAGE)
      const kp = await deriveKeypair(signature)
      await cachePublicKey(hexAddress, kp.publicKey)
      setDerivedKeypair(kp)
      setStage('publish-pubkey')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Key derivation failed')
    } finally {
      setBusy(false)
    }
  }

  const handlePublishPubkey = async () => {
    if (!initiaAddress || !hexAddress) return
    setError(null)
    setBusy(true)
    try {
      let kp = derivedKeypair
      if (!kp) {
        const signature = await sign(KEY_DERIVATION_MESSAGE)
        kp = await deriveKeypair(signature)
        await cachePublicKey(hexAddress, kp.publicKey)
        setDerivedKeypair(kp)
      }
      await sendTx(kit, {
        chainId: ORI_CHAIN_ID,
        messages: [msgSetEncryptionPubkey(initiaAddress, kp.publicKey)],
        autoSign,
        fee: autoSign ? buildAutoSignFee(400_000) : undefined,
      })
      await publishEncryptionPubkey(toBase64(kp.publicKey))
      setStage('create-profile')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Publish pubkey failed')
    } finally {
      setBusy(false)
    }
  }

  const handleCreateProfile = async () => {
    if (!initiaAddress) return
    setError(null)
    setBusy(true)
    try {
      await sendTx(kit, {
        chainId: ORI_CHAIN_ID,
        messages: [msgCreateProfile(initiaAddress, bio.slice(0, 280), '', [], [])],
        autoSign,
        fee: autoSign ? buildAutoSignFee(400_000) : undefined,
      })
      toast.success('You’re in.')
      setStage('done')
      setTimeout(() => router.push('/chats'), 800)
    } catch (e) {
      const m = e instanceof Error ? e.message : 'Create profile failed'
      if (/exists|E_PROFILE_EXISTS/i.test(m)) {
        toast.success('Welcome back')
        setStage('done')
        setTimeout(() => router.push('/chats'), 600)
        return
      }
      setError(m)
    } finally {
      setBusy(false)
    }
  }

  const steps = useMemo(
    () => [
      { id: 'signin' as const, label: 'Sign in', hint: 'One-time signature.' },
      { id: 'claim-init' as const, label: 'Claim your .init name', hint: 'Your handle across Initia.' },
      { id: 'derive-keys' as const, label: 'Derive your E2E key', hint: 'Same wallet → same key, any device.' },
      { id: 'publish-pubkey' as const, label: 'Publish pubkey on-chain', hint: 'So friends can encrypt to you.' },
      { id: 'create-profile' as const, label: 'Create your profile', hint: 'Write a short bio.' },
    ],
    [],
  )

  return (
    <AppShell title="Welcome" hideNav>
      <div className="flex-1 px-5 pt-8 pb-8 max-w-md md:max-w-lg mx-auto w-full">
        <PageHeader
          kicker="01 · Welcome"
          title={
            <>
              Set up your <Serif>identity</Serif>.
            </>
          }
          sub="Five one-tap steps. After this, messages and money move at the same speed."
        />

        {error && (
          <div className="mt-4 rounded-xl border border-danger/40 bg-danger/10 text-danger text-[13.5px] px-4 py-3">
            {error}
          </div>
        )}
        {sessionError && !error && (
          <div className="mt-4 rounded-xl border border-danger/40 bg-danger/10 text-danger text-[13.5px] px-4 py-3">
            {sessionError}
          </div>
        )}

        <ol className="mt-6 space-y-3">
          {steps.map((s) => (
            <StepRow key={s.id} label={s.label} hint={s.hint} state={stageState(stage, s.id)} />
          ))}
        </ol>

        <div className="mt-6">
          {!isConnected ? (
            <button
              onClick={openConnect}
              className={primaryPillClass}
              style={primaryPillInlineStyle}
            >
              Connect wallet
            </button>
          ) : stage === 'signin' ? (
            <button
              onClick={handleSignIn}
              disabled={busy || isSigning || sessionStatus === 'signing' || sessionStatus === 'checking'}
              className={primaryPillClass + ' disabled:opacity-50'}
              style={primaryPillInlineStyle}
            >
              {busy || isSigning ? <Inline spin label="Signing…" /> : 'Sign in'}
            </button>
          ) : stage === 'claim-init' ? (
            <ClaimInitCard
              hasInitName={hasInitName}
              sponsorEnabled={Boolean(sponsorStatus?.enabled)}
              sponsorFeeUmin={sponsorStatus?.usernameFeeUmin ?? 0}
              onSponsor={async (name: string) => {
                if (!initiaAddress) return
                try {
                  const r = await claimUsername.mutateAsync({ address: initiaAddress, name })
                  if (r.txHash) {
                    toast.success('Registration fee sponsored. Now claim it in the portal.')
                  } else {
                    toast.info('Sponsorship covered — proceed in the portal.')
                  }
                } catch (e) {
                  const msg = e instanceof Error ? e.message : 'Sponsorship declined'
                  toast.error(msg)
                }
              }}
              sponsoring={claimUsername.isPending}
            />
          ) : stage === 'derive-keys' ? (
            <button
              onClick={handleDeriveKeys}
              disabled={busy}
              className={primaryPillClass + ' disabled:opacity-50'}
              style={primaryPillInlineStyle}
            >
              {busy ? <Inline spin label="Deriving…" /> : 'Derive E2E key'}
            </button>
          ) : stage === 'publish-pubkey' ? (
            <button
              onClick={handlePublishPubkey}
              disabled={busy}
              className={primaryPillClass + ' disabled:opacity-50'}
              style={primaryPillInlineStyle}
            >
              {busy ? <Inline spin label="Publishing…" /> : 'Publish pubkey'}
            </button>
          ) : stage === 'create-profile' ? (
            <div className="space-y-3">
              <label className="block">
                <span className="text-[12px] uppercase tracking-[0.12em] text-ink-3 font-mono">
                  Short bio · optional
                </span>
                <textarea
                  className="mt-2 w-full rounded-xl border border-border px-3.5 py-3 text-[14px] leading-[1.5] focus:outline-none focus:border-[var(--color-primary)]/60 transition"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.04)' }}
                  rows={3}
                  maxLength={280}
                  placeholder={username ? `Hi, I'm ${username}…` : 'Hi, I’m here for fast money.'}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                />
              </label>
              <button
                onClick={handleCreateProfile}
                disabled={busy}
                className={primaryPillClass + ' disabled:opacity-50'}
                style={primaryPillInlineStyle}
              >
                {busy ? <Inline spin label="Creating…" /> : 'Finish'}
              </button>
            </div>
          ) : (
            <div className="w-full rounded-full h-11 px-5 bg-[var(--color-success)]/10 border border-[var(--color-success)]/40 text-[var(--color-success)] text-[14px] font-medium inline-flex items-center justify-center">
              <Inline icon={<CheckCircle2 className="w-4 h-4" />} label="All set — opening Ori" />
            </div>
          )}
        </div>

        {isAuthenticated && stage !== 'done' && (
          <div className="mt-8 panel-hover rounded-2xl border border-border bg-white/[0.02] p-5">
            <div className="text-[11px] uppercase tracking-[0.14em] text-ink-3 font-mono">
              Ran out of gas?
            </div>
            <div className="mt-2 text-[15px] font-medium">
              Bridge from Initia L1 in <Serif>one tap</Serif>.
            </div>
            <p className="mt-1.5 text-[12.5px] text-ink-3">No leaving Ori.</p>
            <div className="mt-4">
              <BridgeButton variant="inline" className="w-full" />
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}

/**
 * Canonical primary-pill CTA — reference-faithful: white pill + dark ink.
 * Matches the landing's `HeroPrimaryCta` exactly.
 *
 * Two-layer styling belt + braces:
 *   - Tailwind class `bg-foreground text-background` for normal theming.
 *   - Inline style with raw CSS vars as a fallback, because on some Tailwind
 *     v4 builds the `bg-foreground` / `text-background` classes didn't make
 *     it into the compiled CSS chunks and buttons rendered as plain text.
 * Inline styles win on specificity, so if the classes ARE present they just
 * agree with the inline values; if the classes are missing, inline catches.
 */
const primaryPillClass =
  'w-full rounded-full h-11 px-5 inline-flex items-center justify-center gap-1.5 text-[14px] font-medium hover:-translate-y-[1px] transition will-change-transform disabled:translate-y-0'

const primaryPillInlineStyle: React.CSSProperties = {
  backgroundColor: 'var(--color-foreground)',
  color: 'var(--color-background)',
}

function ClaimInitCard({
  hasInitName,
  sponsorEnabled,
  sponsorFeeUmin,
  onSponsor,
  sponsoring,
}: {
  hasInitName: boolean | null
  sponsorEnabled: boolean
  sponsorFeeUmin: number
  onSponsor: (name: string) => void | Promise<void>
  sponsoring: boolean
}) {
  const [desiredName, setDesiredName] = useState('')
  const canSponsor = sponsorEnabled && sponsorFeeUmin > 0
  const feeInit = (sponsorFeeUmin / 1_000_000).toFixed(2)
  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/5 p-5">
        <div className="text-[11px] uppercase tracking-[0.14em] text-ink-3 font-mono">
          Initia L1 · Usernames
        </div>
        <div className="mt-2 text-[15px] font-medium leading-[1.3]">
          Claim your <span className="font-mono">.init</span> name.
        </div>
        <p className="mt-1.5 text-[12.5px] text-ink-3 leading-[1.55]">
          Ori uses <span className="font-mono">.init</span> as identity across every feature. Registration happens
          in the official Initia portal — it opens in a new tab.
        </p>

        {canSponsor && (
          <div className="mt-4 rounded-xl bg-white/[0.02] border border-border p-3.5">
            <div className="text-[10.5px] uppercase tracking-[0.14em] text-[var(--color-success)] font-mono">
              Free for you — we cover the {feeInit} INIT fee
            </div>
            <div className="mt-2.5 flex gap-2">
              <input
                value={desiredName}
                onChange={(e) => setDesiredName(e.target.value.toLowerCase())}
                placeholder="yourname"
                maxLength={24}
                pattern="[a-z0-9_-]+"
                className="flex-1 rounded-lg bg-background border border-border px-3 h-9 text-[13px] font-mono focus:outline-none focus:border-[var(--color-primary)]/60 transition"
              />
              <span className="inline-flex items-center text-[13px] text-ink-3 font-mono">.init</span>
            </div>
            <button
              onClick={() => void onSponsor(desiredName)}
              disabled={sponsoring || !/^[a-z0-9_-]{3,24}$/.test(desiredName)}
              className="mt-2.5 w-full rounded-full h-9 bg-primary/15 hover:bg-primary/25 text-primary text-[12.5px] font-medium transition disabled:opacity-40"
            >
              {sponsoring ? 'Funding…' : `Sponsor my ${desiredName || 'name'}.init`}
            </button>
            <p className="mt-2 text-[11px] text-ink-4">
              We send you exactly the fee, then the portal finalises on L1.
            </p>
          </div>
        )}

        <a
          href={L1_USERNAMES_PORTAL_URL}
          target="_blank"
          rel="noreferrer noopener"
          className="mt-4 w-full rounded-full h-11 px-5 text-[14px] font-medium inline-flex items-center justify-center gap-2 transition hover:-translate-y-[1px] will-change-transform"
          style={{ backgroundColor: 'var(--color-foreground)', color: 'var(--color-background)' }}
        >
          Open registration portal
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      <div className="rounded-xl border border-border bg-white/[0.02] p-4 text-[12px] text-ink-3">
        <div className="flex items-center gap-2">
          {hasInitName === null ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : hasInitName ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-[var(--color-success)]" />
          ) : (
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-[var(--color-primary-bright)] opacity-60 animate-ping" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--color-primary-bright)]" />
            </span>
          )}
          {hasInitName === null
            ? 'Checking…'
            : hasInitName
              ? 'Registered — continuing…'
              : 'Waiting for your .init to appear on L1. This page refreshes once it does.'}
        </div>
      </div>
    </div>
  )
}

function StepRow({
  label,
  hint,
  state,
}: {
  label: string
  hint: string
  state: 'pending' | 'current' | 'done'
}) {
  // Same three-tone scheme the landing uses: current = indigo tint, done =
  // success tint, pending = base white/[0.02] surface with the hairline
  // panel-hover border-brighten. No solid accent borders — they shout.
  const rowClass =
    state === 'current'
      ? 'border-[var(--color-primary)]/40 bg-[var(--color-primary)]/5'
      : state === 'done'
        ? 'border-[var(--color-success)]/40 bg-[var(--color-success)]/5'
        : 'border-border bg-white/[0.02] panel-hover'

  const bubbleClass =
    state === 'done'
      ? 'bg-[var(--color-success)] text-[var(--color-success-foreground)]'
      : state === 'current'
        ? 'bg-[var(--color-primary)] text-white'
        : 'bg-white/[0.06] text-ink-4'

  return (
    <li
      className={
        'flex items-start gap-3 rounded-xl border px-4 py-3.5 transition ' + rowClass
      }
    >
      <div
        className={
          'mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0 ' +
          bubbleClass
        }
      >
        {state === 'done' ? '✓' : state === 'current' ? '•' : ''}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13.5px] font-medium leading-[1.25]">{label}</div>
        <div className="mt-0.5 text-[12px] text-ink-3 leading-[1.45]">{hint}</div>
      </div>
    </li>
  )
}

function Inline({ spin, icon, label }: { spin?: boolean; icon?: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 justify-center">
      {spin ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
      {label}
    </span>
  )
}

function stageState(current: Stage, target: Stage): 'pending' | 'current' | 'done' {
  const order: Stage[] = [
    'connect',
    'signin',
    'claim-init',
    'derive-keys',
    'publish-pubkey',
    'create-profile',
    'done',
  ]
  const ci = order.indexOf(current)
  const ti = order.indexOf(target)
  if (ci > ti) return 'done'
  if (ci === ti) return 'current'
  return 'pending'
}
