'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useInterwovenKit } from '@initia/interwovenkit-react'
import { toast } from 'sonner'
import { CheckCircle2, ExternalLink, Loader2 } from 'lucide-react'

import { AppShell } from '@/components/app-shell'
import { BridgeButton } from '@/components/bridge-button'
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
      toast.success('You’re in 🎉')
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
    <AppShell title="Welcome to Ori" hideNav>
      <div className="flex-1 px-5 py-6 max-w-md mx-auto w-full">
        <h1 className="text-3xl font-bold tracking-tight">Set up your identity</h1>
        <p className="mt-2 text-muted-foreground">
          Five one-tap steps. After this, messages and money move at the same speed.
        </p>

        {error && (
          <div className="mt-4 rounded-xl border border-danger/40 bg-danger/10 text-danger text-sm px-4 py-3">
            {error}
          </div>
        )}
        {sessionError && !error && (
          <div className="mt-4 rounded-xl border border-danger/40 bg-danger/10 text-danger text-sm px-4 py-3">
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
              className="w-full rounded-2xl py-4 bg-primary text-primary-foreground font-medium"
            >
              Connect wallet
            </button>
          ) : stage === 'signin' ? (
            <button
              onClick={handleSignIn}
              disabled={busy || isSigning || sessionStatus === 'signing' || sessionStatus === 'checking'}
              className="w-full rounded-2xl py-4 bg-primary text-primary-foreground font-medium disabled:opacity-50"
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
              className="w-full rounded-2xl py-4 bg-primary text-primary-foreground font-medium disabled:opacity-50"
            >
              {busy ? <Inline spin label="Deriving…" /> : 'Derive E2E key'}
            </button>
          ) : stage === 'publish-pubkey' ? (
            <button
              onClick={handlePublishPubkey}
              disabled={busy}
              className="w-full rounded-2xl py-4 bg-primary text-primary-foreground font-medium disabled:opacity-50"
            >
              {busy ? <Inline spin label="Publishing…" /> : 'Publish pubkey'}
            </button>
          ) : stage === 'create-profile' ? (
            <div className="space-y-3">
              <label className="block">
                <span className="text-sm text-muted-foreground">Short bio (optional)</span>
                <textarea
                  className="mt-1 w-full rounded-xl bg-muted border border-border px-3 py-3 text-sm focus:outline-none focus:border-primary"
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
                className="w-full rounded-2xl py-4 bg-primary text-primary-foreground font-medium disabled:opacity-50"
              >
                {busy ? <Inline spin label="Creating…" /> : 'Finish'}
              </button>
            </div>
          ) : (
            <div className="w-full rounded-2xl py-4 bg-success/15 border border-success/40 text-success text-center font-medium">
              <Inline icon={<CheckCircle2 className="w-5 h-5" />} label="All set — opening Ori" />
            </div>
          )}
        </div>

        {isAuthenticated && stage !== 'done' && (
          <div className="mt-8 rounded-2xl border border-border bg-muted/30 p-4">
            <div className="text-sm font-medium">Need INIT to pay gas?</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Bridge from Initia L1 in one tap. No leaving Ori.
            </p>
            <div className="mt-3">
              <BridgeButton variant="inline" className="w-full" />
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
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
      <div className="rounded-xl border border-primary/40 bg-primary/5 p-4">
        <div className="text-sm font-medium">Register your .init on Initia L1</div>
        <p className="mt-1 text-xs text-muted-foreground">
          Ori uses your <span className="font-mono">.init</span> as identity across every feature.
          Registration happens in the official Initia portal (opens in a new tab).
        </p>

        {canSponsor && (
          <div className="mt-3 rounded-lg bg-muted/40 border border-border p-3">
            <div className="text-[11px] uppercase tracking-wide text-success">
              Free for you — we cover the {feeInit} INIT fee
            </div>
            <div className="mt-2 flex gap-2">
              <input
                value={desiredName}
                onChange={(e) => setDesiredName(e.target.value.toLowerCase())}
                placeholder="yourname"
                maxLength={24}
                pattern="[a-z0-9_-]+"
                className="flex-1 rounded-lg bg-background border border-border px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary"
              />
              <span className="inline-flex items-center text-sm text-muted-foreground">.init</span>
            </div>
            <button
              onClick={() => void onSponsor(desiredName)}
              disabled={sponsoring || !/^[a-z0-9_-]{3,24}$/.test(desiredName)}
              className="mt-2 w-full rounded-lg py-2 bg-primary/20 text-primary text-sm font-medium disabled:opacity-40"
            >
              {sponsoring ? 'Funding…' : `Sponsor my ${desiredName || 'name'}.init`}
            </button>
            <p className="mt-2 text-[11px] text-muted-foreground">
              We send you exactly the fee, then the portal below finalises on L1.
            </p>
          </div>
        )}

        <a
          href={L1_USERNAMES_PORTAL_URL}
          target="_blank"
          rel="noreferrer noopener"
          className="mt-3 w-full rounded-xl py-3 bg-primary text-primary-foreground font-medium inline-flex items-center justify-center gap-2"
        >
          Open registration portal
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>

      <div className="rounded-xl border border-border bg-muted/30 p-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          {hasInitName === null ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : hasInitName ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-success" />
          ) : (
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          )}
          {hasInitName === null
            ? 'Checking…'
            : hasInitName
              ? 'Registered — continuing…'
              : 'Waiting for your .init to appear on L1. This page refreshes automatically once done.'}
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
  return (
    <li
      className={
        'flex items-start gap-3 rounded-xl border px-4 py-3 transition ' +
        (state === 'current'
          ? 'border-primary bg-primary/5'
          : state === 'done'
            ? 'border-success/40 bg-success/5'
            : 'border-border bg-muted/40')
      }
    >
      <div
        className={
          'mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ' +
          (state === 'done'
            ? 'bg-success text-background'
            : state === 'current'
              ? 'bg-primary text-primary-foreground'
              : 'bg-border text-muted-foreground')
        }
      >
        {state === 'done' ? '✓' : state === 'current' ? '•' : ''}
      </div>
      <div className="flex-1">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{hint}</div>
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
