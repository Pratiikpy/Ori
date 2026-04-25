'use client'

/**
 * /onboard — sign-in wizard.
 *
 * Two-stage flow for the demo path:
 *   stage = "connect"   → wallet not yet attached. Show the big "Connect"
 *                         CTA which opens InterwovenKit.
 *   stage = "signin"    → wallet connected, no session. Show "Sign in"
 *                         button which fires the EIP-191 challenge.
 *   stage = "done"      → both done. Auto-redirect to /today.
 *
 * Advanced steps (claim .init, derive E2E key, publish pubkey) live behind
 * a tertiary link at the bottom of the card. They're not blocking — a user
 * can use core chat + payments without them. We removed them from the
 * primary path because they were the #1 source of "I'm stuck" bugs in the
 * legacy wizard.
 */
import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useInterwovenKit } from '@initia/interwovenkit-react'
import Link from 'next/link'
import { LandingShell } from '@/components/layout/landing-shell'
import { Button, GlassCard, Icon, Eyebrow } from '@/components/ui'
import { useSession } from '@/hooks/use-session'

type Stage = 'connect' | 'signin' | 'done'

export default function OnboardPage() {
  const router = useRouter()
  const { isConnected, openConnect, initiaAddress, username } = useInterwovenKit()
  const { isAuthenticated, isSigning, signIn, error: sessionError } = useSession()

  const stage: Stage = !isConnected
    ? 'connect'
    : !isAuthenticated
    ? 'signin'
    : 'done'

  const [busy, setBusy] = React.useState(false)
  const [localError, setLocalError] = React.useState<string | null>(null)

  // Auto-bounce when fully signed in
  React.useEffect(() => {
    if (stage === 'done') {
      const t = setTimeout(() => router.push('/today'), 600)
      return () => clearTimeout(t)
    }
  }, [stage, router])

  const handleSignIn = async () => {
    setLocalError(null)
    setBusy(true)
    try {
      await signIn()
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : 'Sign-in failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <LandingShell>
      <section className="mx-auto w-full max-w-lg px-5 sm:px-8 pt-16 sm:pt-24 pb-20">
        <Eyebrow>Welcome to Ori</Eyebrow>
        <h1
          className="mt-3 font-display font-medium text-ink leading-[1.05] tracking-[-0.02em]"
          style={{ fontSize: 'clamp(32px, 5vw, 48px)' }}
        >
          Two taps to set up.
        </h1>
        <p className="mt-4 text-[16px] text-ink-2 leading-[1.55]">
          Connect a wallet, sign one message. After that, payments and chat move at the same speed.
        </p>

        {/* Steps card */}
        <GlassCard padding="lg" className="mt-10">
          <ol className="flex flex-col gap-3">
            <Step
              n={1}
              label="Connect wallet"
              hint="Privy, MetaMask, or any EVM wallet."
              state={stage === 'connect' ? 'current' : 'done'}
            />
            <Step
              n={2}
              label="Sign in"
              hint="One signature. No transaction fee."
              state={
                stage === 'connect'
                  ? 'pending'
                  : stage === 'signin'
                  ? 'current'
                  : 'done'
              }
            />
          </ol>

          {/* Active CTA */}
          <div className="mt-6">
            {stage === 'connect' && (
              <Button
                variant="primary"
                size="lg"
                fullWidth
                trailingIcon="arrow-right"
                onClick={() => void openConnect()}
              >
                Connect wallet
              </Button>
            )}
            {stage === 'signin' && (
              <Button
                variant="primary"
                size="lg"
                fullWidth
                trailingIcon="arrow-right"
                loading={busy || isSigning}
                onClick={handleSignIn}
              >
                Sign in
              </Button>
            )}
            {stage === 'done' && (
              <div className="h-12 rounded-full bg-[#058A4D]/10 text-[#058A4D] text-[14px] font-medium inline-flex items-center justify-center gap-2 w-full">
                <Icon name="check-circle" size={18} weight="fill" />
                You're in — opening Ori…
              </div>
            )}
          </div>

          {(localError || sessionError) && (
            <p className="mt-4 text-[13px] text-[#B91C1C]">
              {localError || sessionError}
            </p>
          )}

          {/* Show address pill once connected */}
          {isConnected && initiaAddress && (
            <div className="mt-5 pt-5 border-t border-black/5">
              <Eyebrow>Connected as</Eyebrow>
              <div className="mt-2 flex items-center gap-2">
                <Icon name="wallet" size={16} className="text-ink-3" />
                <span className="font-mono text-[13px] text-ink">
                  {username ?? `${initiaAddress.slice(0, 12)}…${initiaAddress.slice(-6)}`}
                </span>
              </div>
            </div>
          )}
        </GlassCard>

        {/* Advanced */}
        <details className="mt-8 group">
          <summary className="text-[13px] text-ink-3 cursor-pointer select-none hover:text-ink transition list-none flex items-center gap-2">
            <Icon
              name="arrow-right"
              size={12}
              className="transition-transform group-open:rotate-90"
            />
            Advanced setup (E2E keys, .init name)
          </summary>
          <div className="mt-3 ml-5 text-[13px] text-ink-3 leading-[1.55]">
            For end-to-end-encrypted DMs and a public username, finish setup
            in <Link href="/settings" className="text-[#007AFF] hover:underline">Settings</Link>{' '}
            once you're signed in. Core chat and payments work without these.
          </div>
        </details>
      </section>
    </LandingShell>
  )
}

function Step({
  n,
  label,
  hint,
  state,
}: {
  n: number
  label: string
  hint: string
  state: 'pending' | 'current' | 'done'
}) {
  const styles =
    state === 'done'
      ? 'bg-[#058A4D]/10 border-[#058A4D]/20'
      : state === 'current'
      ? 'bg-white/80 border-black/10 ring-2 ring-[#007AFF]/20'
      : 'bg-white/40 border-black/5'

  return (
    <li
      className={[
        'flex items-center gap-4 rounded-2xl border px-4 py-3.5',
        styles,
      ].join(' ')}
    >
      <span
        className={[
          'w-8 h-8 rounded-full inline-flex items-center justify-center text-[13px] font-mono',
          state === 'done'
            ? 'bg-[#058A4D] text-white'
            : state === 'current'
            ? 'bg-[#1D1D1F] text-white'
            : 'bg-black/10 text-ink-3',
        ].join(' ')}
      >
        {state === 'done' ? <Icon name="check" size={14} weight="bold" /> : n}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-[14px] font-medium text-ink">{label}</div>
        <div className="text-[12.5px] text-ink-3">{hint}</div>
      </div>
    </li>
  )
}
