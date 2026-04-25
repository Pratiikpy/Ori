'use client'

/**
 * /settings — minimal config surface.
 *
 * Two cards: identity (display name, address pill, sign out) and a
 * lightweight agent-policy stub. The full settings (bio, links, privacy
 * toggles, agent kill switch) are out of scope for the rebuild MVP — we
 * link to /onboard for advanced setup steps and keep this page focused
 * on what every user needs to see post-sign-in.
 */
import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useInterwovenKit } from '@initia/interwovenkit-react'
import { AppShell } from '@/components/layout/app-shell'
import {
  Avatar,
  Button,
  Eyebrow,
  GlassCard,
  Icon,
  PageHeader,
} from '@/components/ui'
import { useSession } from '@/hooks/use-session'
import { useAutoSign } from '@/hooks/use-auto-sign'

export default function SettingsPage() {
  const router = useRouter()
  const { isConnected, initiaAddress, hexAddress, username, openWallet } =
    useInterwovenKit()
  const { isAuthenticated, status, signOut } = useSession()
  const { isEnabled: autoSign, enable, disable } = useAutoSign()

  React.useEffect(() => {
    if (!isConnected) router.replace('/')
    else if (status === 'unauthenticated') router.replace('/onboard')
  }, [isConnected, status, router])

  const display = username ?? (initiaAddress ? shortAddr(initiaAddress) : '')

  return (
    <AppShell>
      <PageHeader
        title="Settings"
        description="Your wallet, your auto-sign rules, your sign-out — all in one place."
      />

      {/* Identity */}
      <GlassCard padding="lg" className="mt-10">
        <Eyebrow>Identity</Eyebrow>
        <div className="mt-4 flex items-center gap-4">
          <Avatar seed={initiaAddress ?? 'ori'} initial={display[0]} size="xl" />
          <div className="flex-1 min-w-0">
            <div className="text-[20px] font-display font-medium text-ink leading-tight">
              {display}
            </div>
            {initiaAddress && (
              <div className="mt-1 font-mono text-[12.5px] text-ink-3 truncate">
                {initiaAddress}
              </div>
            )}
            {hexAddress && (
              <div className="mt-0.5 font-mono text-[11.5px] text-ink-4 truncate">
                {hexAddress}
              </div>
            )}
          </div>
          <Button variant="secondary" size="sm" onClick={() => openWallet()}>
            Wallet
          </Button>
        </div>
      </GlassCard>

      {/* Auto-sign */}
      <GlassCard padding="lg" className="mt-5">
        <div className="flex items-start gap-4">
          <div
            className={[
              'w-12 h-12 rounded-2xl inline-flex items-center justify-center shrink-0',
              autoSign ? 'bg-[#058A4D]/10' : 'bg-black/5',
            ].join(' ')}
          >
            <Icon
              name="lightning"
              size={22}
              weight={autoSign ? 'fill' : 'regular'}
              className={autoSign ? 'text-[#058A4D]' : 'text-ink-3'}
            />
          </div>
          <div className="flex-1 min-w-0">
            <Eyebrow>Auto-sign</Eyebrow>
            <h3 className="mt-1 text-[16px] font-display font-medium text-ink leading-tight">
              {autoSign ? 'On — payments are silent' : 'Off — wallet asks each time'}
            </h3>
            <p className="mt-1.5 text-[13px] text-ink-3 leading-[1.55]">
              When on, transactions sign without a popup for 24 hours. Useful
              for chat-rate payments. You can revoke at any time.
            </p>
          </div>
          <Button
            variant={autoSign ? 'secondary' : 'primary'}
            size="sm"
            onClick={() => (autoSign ? disable() : enable())}
          >
            {autoSign ? 'Turn off' : 'Turn on'}
          </Button>
        </div>
      </GlassCard>

      {/* Agent policy — stub for now */}
      <GlassCard padding="lg" className="mt-5">
        <Eyebrow>Agent policy</Eyebrow>
        <h3 className="mt-2 text-[16px] font-display font-medium text-ink leading-tight">
          On-chain spending caps
        </h3>
        <p className="mt-1.5 text-[13px] text-ink-3 leading-[1.55] max-w-xl">
          Limits, kill switch, and per-agent receipts live in the
          <span className="font-mono text-ink-2"> agent_policy</span> Move
          module on the ori-1 rollup. Full UI for this lands in the next
          release; for now configure via the MCP server's local env vars.
        </p>
        <Button
          className="mt-4"
          variant="secondary"
          size="sm"
          trailingIcon="arrow-right"
          onClick={() => router.push('/ask')}
        >
          Configure via Claude
        </Button>
      </GlassCard>

      {/* Sign out */}
      <GlassCard padding="lg" className="mt-5">
        <Eyebrow>Session</Eyebrow>
        <div className="mt-2 flex items-start justify-between gap-4">
          <p className="text-[13px] text-ink-3 leading-[1.55] max-w-md">
            Signing out clears the local session token. Your wallet stays
            connected; you'll need to sign one message to come back.
          </p>
          <Button
            variant="secondary"
            size="sm"
            disabled={!isAuthenticated}
            onClick={() => void signOut()}
          >
            Sign out
          </Button>
        </div>
      </GlassCard>
    </AppShell>
  )
}

function shortAddr(a: string): string {
  return `${a.slice(0, 8)}…${a.slice(-4)}`
}
