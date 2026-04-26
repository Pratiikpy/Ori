'use client'

/**
 * Profile page — wired to real backend endpoints + Move msg helpers.
 *
 * Visual baseline: ui-ref-orii/frontend/src/pages/Profile.jsx (preserved).
 *
 * Wired:
 *   • Identity card           → useProfile + useFollowStats + useTrustScore
 *   • Authorized agents list  → useAgentActionsByOwner (distinct agentAddr)
 *   • Achievements card       → useBadges
 *   • Quests card             → useQuests
 *   • Merchant + links card   → profile.links (chip if empty)
 *   • Notifications           → useAutoSign for one-tap toggle
 *   • Identity tab actions    → msgCreateProfile, msgUpdateBio, msgUpdateLinks,
 *                                msgSetSlug, msgSetEncryptionPubkey,
 *                                msgUpdatePrivacy, msgFollow, msgUnfollow
 *   • Agent policy tab        → msgSetAgentPolicy, msgRevokeAgent
 *   • Settings tab            → agent-card link to /.well-known/agent.json
 *   • Privacy switch          → msgUpdatePrivacy on toggle
 *   • Agent policy slider     → msgSetAgentPolicy on commit (requires agent addr)
 *
 * Settings push subscribe/delete use the real PWA push endpoints through
 * lib/push-client.
 */
import { useMemo, useState } from 'react'
import {
  BadgeCheck,
  Bell,
  Bot,
  Link as LinkIcon,
  ShieldCheck,
  Store,
  Trophy,
} from 'lucide-react'
import { useInterwovenKit } from '@initia/interwovenkit-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ActionCard,
  ActionDialog,
  type Action,
  type ActionRecord,
} from '@/components/action-dialog'
import { profileActions } from '@/data/ori-data'

import { useProfile, useBadges } from '@/hooks/use-profile'
import { useQuests } from '@/hooks/use-quests'
import { useTrustScore } from '@/hooks/use-trust-score'
import { useFollowStats } from '@/hooks/use-follows'
import { useAgentActionsByOwner } from '@/hooks/use-agent-actions'
import { useAutoSign } from '@/hooks/use-auto-sign'

import {
  msgCreateProfile,
  msgUpdateBio,
  msgUpdateAvatar,
  msgUpdateLinks,
  msgSetSlug,
  msgSetEncryptionPubkey,
  msgUpdatePrivacy,
  msgFollow,
  msgUnfollow,
  msgSetAgentPolicy,
  msgRevokeAgent,
  msgThumbsUp,
  msgThumbsDown,
  msgRetractVote,
  msgAttest,
} from '@/lib/contracts'
import {
  ORI_CHAIN_ID,
  ORI_DECIMALS,
  GAS_LIMITS,
} from '@/lib/chain-config'
import { sendTx, buildAutoSignFee, friendlyError } from '@/lib/tx'
import { ensurePushSubscription, unsubscribePush } from '@/lib/push-client'

/**
 * Optional default agent address for the policy slider commit. If unset, the
 * slider commit shows a "Select an agent first." toast — explicit form fields
 * for the agent address arrive via the Identity action grid (`set-agent-policy`).
 */
const DEFAULT_AGENT_ADDRESS =
  process.env.NEXT_PUBLIC_ORI_DEFAULT_AGENT_ADDRESS ?? ''

function shortenAddress(address: string | undefined | null): string {
  if (!address) return '—'
  if (address.length <= 16) return address
  return `${address.slice(0, 8)}...${address.slice(-4)}`
}

/**
 * Convert a human INIT amount (e.g. "250") to base units (umin) using the
 * configured decimals. Returns 0n on parse failure.
 */
function initToBaseUnits(amount: number | string): bigint {
  const s = String(amount)
  if (!/^\d+(\.\d+)?$/.test(s)) return 0n
  const [whole = '0', frac = ''] = s.split('.')
  const fracPadded = (frac + '0'.repeat(ORI_DECIMALS)).slice(0, ORI_DECIMALS)
  return BigInt(whole) * 10n ** BigInt(ORI_DECIMALS) + BigInt(fracPadded || '0')
}

type AnyMsg = ReturnType<typeof msgUpdateBio>

export default function ProfilePage() {
  const kit = useInterwovenKit()
  const { initiaAddress, isConnected, openConnect } = kit
  const { isEnabled: autoSignEnabled, enable: enableAutoSign, disable: disableAutoSign } =
    useAutoSign()

  // Backend reads (all gated by `enabled: Boolean(address)` in the hook).
  const profile = useProfile(initiaAddress)
  const followStats = useFollowStats(initiaAddress)
  const trustScore = useTrustScore(initiaAddress)
  const badges = useBadges(initiaAddress)
  const quests = useQuests(initiaAddress)
  const agentActions = useAgentActionsByOwner(initiaAddress)

  // Local UI state.
  const [modalAction, setModalAction] = useState<Action | null>(null)
  const [recentAction, setRecentAction] = useState<ActionRecord | null>(null)
  const [privateFollows, setPrivateFollows] = useState(true)
  const [pushEnabled, setPushEnabled] = useState(false)
  const [agentLimit, setAgentLimit] = useState<number[]>([250])
  const [busy, setBusy] = useState(false)

  // Derived identity.
  const handle = useMemo(() => {
    if (profile.data?.initName) return `${profile.data.initName}.init`
    return shortenAddress(initiaAddress)
  }, [profile.data?.initName, initiaAddress])

  const bio = profile.data?.bio || '—'
  const addressDisplay = shortenAddress(initiaAddress)
  const followersDisplay =
    followStats.data?.followers !== undefined ? followStats.data.followers : '—'
  const followingDisplay =
    followStats.data?.following !== undefined ? followStats.data.following : '—'
  const trustDisplay = trustScore.data
    ? `${trustScore.data.score}/${trustScore.data.maxScore}`
    : '—'

  // Distinct agents derived from this user's MCP action log.
  const distinctAgents = useMemo(() => {
    const rows = agentActions.data?.entries ?? []
    const seen = new Set<string>()
    const out: { agentAddr: string; lastTool: string; lastAt: string }[] = []
    for (const row of rows) {
      if (seen.has(row.agentAddr)) continue
      seen.add(row.agentAddr)
      out.push({
        agentAddr: row.agentAddr,
        lastTool: row.toolName,
        lastAt: row.createdAt,
      })
    }
    return out
  }, [agentActions.data])

  /** Send a single Move msg via auto-sign or InterwovenKit drawer. */
  const submitMsg = async (msg: AnyMsg, label: string, gasLimit: number = GAS_LIMITS.simpleTx) => {
    if (!isConnected || !initiaAddress) {
      void openConnect()
      return
    }
    setBusy(true)
    try {
      await sendTx(kit, {
        chainId: ORI_CHAIN_ID,
        messages: [msg],
        autoSign: autoSignEnabled,
        fee: autoSignEnabled ? buildAutoSignFee(gasLimit) : undefined,
      })
      toast.success(`${label} submitted`)
    } catch (e) {
      toast.error(friendlyError(e))
    } finally {
      setBusy(false)
    }
  }

  /** Slider commit: requires agent address. */
  const handleAgentLimitCommit = async (value: number[]) => {
    if (!isConnected || !initiaAddress) {
      void openConnect()
      return
    }
    if (!DEFAULT_AGENT_ADDRESS) {
      toast.message('Select an agent first.', {
        description:
          'Use the "Set agent spending policy" action in the Agent policy tab to enter an agent address.',
      })
      return
    }
    const cap = initToBaseUnits(value[0] ?? 0)
    const msg = msgSetAgentPolicy({
      sender: initiaAddress,
      agent: DEFAULT_AGENT_ADDRESS,
      dailyCap: cap,
    })
    await submitMsg(msg, 'Agent policy update')
  }

  /** Privacy switch: flips whitelistOnly (per spec). */
  const handlePrivacyToggle = async (next: boolean) => {
    setPrivateFollows(next)
    if (!isConnected || !initiaAddress) {
      void openConnect()
      return
    }
    const msg = msgUpdatePrivacy(
      initiaAddress,
      profile.data?.hideBalance ?? false,
      profile.data?.hideActivity ?? false,
      next,
    )
    await submitMsg(msg, 'Privacy update')
  }

  /** One-tap auto-sign toggle wired to InterwovenKit. */
  const handleAutoSignToggle = async (next: boolean) => {
    try {
      if (next) await enableAutoSign()
      else await disableAutoSign()
    } catch (e) {
      toast.error(friendlyError(e))
    }
  }

  /**
   * Map an action.id from the static profileActions catalogue to the helper
   * that builds its msg. The ActionDialog collects free-text fields, so we
   * do best-effort string parsing for vector inputs.
   */
  const dispatchAction = async (action: Action, values: Record<string, string>) => {
    if (!isConnected || !initiaAddress) {
      void openConnect()
      return
    }

    // First field value (for single-arg helpers).
    const fieldEntries = Object.entries(values)
    const firstValue = fieldEntries[0]?.[1] ?? ''
    const secondValue = fieldEntries[1]?.[1] ?? ''

    try {
      switch (action.id) {
        // ---------- identity tab ----------
        case 'create-profile': {
          const links = secondValue
            ? secondValue.split(',').map((s) => s.trim()).filter(Boolean)
            : []
          await submitMsg(
            msgCreateProfile(initiaAddress, firstValue, '', links, links),
            'Profile created',
            GAS_LIMITS.mediumTx,
          )
          return
        }
        // Old combined 'update-bio-avatar-links' is split into three explicit
        // actions per the audit feedback. The previous heuristic misclassified
        // bios that contained commas as link lists (silent data loss).
        case 'update-bio': {
          await submitMsg(msgUpdateBio(initiaAddress, firstValue), 'Bio updated')
          return
        }
        case 'update-avatar': {
          await submitMsg(msgUpdateAvatar(initiaAddress, firstValue), 'Avatar updated')
          return
        }
        case 'update-links': {
          const links = firstValue
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
          await submitMsg(msgUpdateLinks(initiaAddress, links, links), 'Links updated')
          return
        }
        case 'set-slug': {
          await submitMsg(msgSetSlug(initiaAddress, firstValue), 'Slug set')
          return
        }
        case 'set-encryption-pubkey': {
          // Accept hex (with or without 0x) or base64-ish; minimal validation.
          let bytes: Uint8Array
          const hex = firstValue.startsWith('0x') ? firstValue.slice(2) : firstValue
          if (/^[0-9a-fA-F]+$/.test(hex) && hex.length === 64) {
            bytes = new Uint8Array(
              hex.match(/.{2}/g)!.map((b) => parseInt(b, 16)),
            )
          } else {
            toast.error('Encryption pubkey must be 32 bytes (64 hex chars).')
            return
          }
          await submitMsg(
            msgSetEncryptionPubkey(initiaAddress, bytes),
            'Encryption pubkey set',
          )
          return
        }
        case 'update-privacy-settings': {
          // Best-effort: read three booleans (true/yes/1) from first three fields.
          const toBool = (s: string) => /^(1|true|yes|y|on)$/i.test(s.trim())
          const [a, b, c] = fieldEntries.map(([, v]) => toBool(v))
          await submitMsg(
            msgUpdatePrivacy(initiaAddress, Boolean(a), Boolean(b), Boolean(c)),
            'Privacy updated',
          )
          return
        }
        case 'follow-user': {
          if (!firstValue) {
            toast.error('Enter an address to follow.')
            return
          }
          await submitMsg(
            msgFollow({ follower: initiaAddress, target: firstValue }),
            'Followed',
          )
          return
        }
        case 'unfollow-user': {
          if (!firstValue) {
            toast.error('Enter an address to unfollow.')
            return
          }
          await submitMsg(
            msgUnfollow({ follower: initiaAddress, target: firstValue }),
            'Unfollowed',
          )
          return
        }

        // ---------- agent policy tab ----------
        case 'set-agent-policy': {
          if (!firstValue) {
            toast.error('Enter an agent address.')
            return
          }
          const cap = initToBaseUnits(secondValue || '0')
          await submitMsg(
            msgSetAgentPolicy({
              sender: initiaAddress,
              agent: firstValue,
              dailyCap: cap,
            }),
            'Agent policy set',
          )
          return
        }
        case 'revoke-agent': {
          if (!firstValue) {
            toast.error('Enter an agent address.')
            return
          }
          await submitMsg(
            msgRevokeAgent({ sender: initiaAddress, agent: firstValue }),
            'Agent revoked',
          )
          return
        }
        case 'agent-kill-switch': {
          // Revoke every agent the wallet has ever interacted with. We
          // derive the list from the agent_actions log (distinctAgents
          // memo above). Each revoke is its own tx — broadcast in
          // sequence so a single failure doesn't strand the rest.
          if (distinctAgents.length === 0) {
            toast.message('No agents to revoke', {
              description: 'No tracked agent activity for this wallet.',
            })
            return
          }
          let success = 0
          for (const a of distinctAgents) {
            try {
              await submitMsg(
                msgRevokeAgent({ sender: initiaAddress, agent: a.agentAddr }),
                `Revoked ${a.agentAddr.slice(0, 10)}…`,
              )
              success++
            } catch (err) {
              toast.error(`Revoke failed for ${a.agentAddr.slice(0, 10)}…`, {
                description: err instanceof Error ? err.message : String(err),
              })
            }
          }
          toast.success(`Kill switch complete — revoked ${success}/${distinctAgents.length}`)
          return
        }

        // ---------- settings tab ----------
        case 'push-subscribe': {
          const sub = await ensurePushSubscription()
          if (!sub) toast.error('Push notifications are not available or permission was denied')
          else {
            setPushEnabled(true)
            toast.success('Push notifications registered')
          }
          return
        }
        case 'push-delete': {
          await unsubscribePush()
          setPushEnabled(false)
          toast.success('Push notifications removed')
          return
        }
        case 'agent-card': {
          if (typeof window !== 'undefined') {
            window.open(
              `${window.location.origin}/.well-known/agent.json`,
              '_blank',
              'noopener,noreferrer',
            )
          }
          return
        }

        // ---------- reputation tab ----------
        case 'thumbs-up': {
          if (!firstValue) {
            toast.error('Enter a target address')
            return
          }
          await submitMsg(msgThumbsUp({ voter: initiaAddress, target: firstValue }), 'Thumbs up')
          return
        }
        case 'thumbs-down': {
          if (!firstValue) {
            toast.error('Enter a target address')
            return
          }
          await submitMsg(msgThumbsDown({ voter: initiaAddress, target: firstValue }), 'Thumbs down')
          return
        }
        case 'retract-vote': {
          if (!firstValue) {
            toast.error('Enter a target address')
            return
          }
          await submitMsg(msgRetractVote({ voter: initiaAddress, target: firstValue }), 'Vote retracted')
          return
        }
        case 'attest-signed-claim': {
          if (!firstValue) {
            toast.error('Enter a target address')
            return
          }
          await submitMsg(
            msgAttest({
              attester: initiaAddress,
              target: firstValue,
              claim: secondValue || 'Ori attestation',
              evidenceUri: '',
            }),
            'Attestation submitted',
          )
          return
        }

        default: {
          toast.message(`${action.title} is not available in this build`, {
            description: `Action id: ${action.id}`,
          })
        }
      }
    } catch (e) {
      toast.error(friendlyError(e))
    }
  }

  // -----------------------------------------------------------------------
  // Disconnected shell
  // -----------------------------------------------------------------------
  if (!isConnected) {
    return (
      <section className="p-4 sm:p-6 lg:p-8" data-testid="profile-page">
        <div
          className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_420px]"
          data-testid="profile-header-grid"
        >
          <div
            className="border border-black/10 bg-[#F5F5F5] p-6"
            data-testid="profile-identity-card"
          >
            <p
              className="text-xs font-bold uppercase tracking-[0.2em] text-[#52525B]"
              data-testid="profile-overline"
            >
              Profile registry
            </p>
            <h2
              className="mt-3 font-heading text-5xl font-black tracking-tighter"
              data-testid="profile-handle"
            >
              Connect wallet
            </h2>
            <p
              className="mt-4 max-w-2xl text-sm leading-6 text-[#52525B]"
              data-testid="profile-bio"
            >
              Sign in to view your profile, badges, quests, and agent policy.
            </p>
            <Button
              onClick={() => void openConnect()}
              className="mt-6 rounded-none bg-[#0022FF] hover:bg-[#0019CC]"
              data-testid="profile-connect-cta"
            >
              Connect wallet
            </Button>
          </div>
          <div
            className="border border-black bg-black p-6 text-white"
            data-testid="agent-policy-card"
          >
            <Bot className="h-7 w-7 text-[#0022FF]" />
            <h3
              className="mt-5 font-heading text-3xl font-black tracking-tight"
              data-testid="agent-policy-title"
            >
              MCP agent policy
            </h3>
            <p className="mt-2 text-sm text-white/70" data-testid="agent-policy-copy">
              Connect your wallet to manage agent caps, revoke access, and
              configure privacy.
            </p>
          </div>
        </div>

        <div
          className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-4"
          data-testid="profile-secondary-grid"
        >
          {profileActions.map((section) => (
            <article
              key={section.id}
              className="border border-black/10 bg-white p-6"
              data-testid={`profile-disconnected-section-${section.id}`}
            >
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#52525B]" data-testid={`profile-disconnected-section-label-${section.id}`}>{section.label}</p>
              <p className="mt-3 text-sm text-[#52525B]" data-testid={`profile-disconnected-section-summary-${section.id}`}>
                {section.actions.slice(0, 2).map((action) => action.title).join(' · ')}
              </p>
              <Button
                variant="outline"
                onClick={() => void openConnect()}
                className="mt-4 rounded-none border-black/20 hover:bg-black hover:text-white"
                data-testid={`profile-disconnected-connect-${section.id}`}
              >
                Connect to use
              </Button>
            </article>
          ))}
        </div>
      </section>
    )
  }

  // -----------------------------------------------------------------------
  // Connected shell
  // -----------------------------------------------------------------------
  return (
    <section className="p-4 sm:p-6 lg:p-8" data-testid="profile-page">
      <div
        className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_420px]"
        data-testid="profile-header-grid"
      >
        <div
          className="border border-black/10 bg-[#F5F5F5] p-6"
          data-testid="profile-identity-card"
        >
          <p
            className="text-xs font-bold uppercase tracking-[0.2em] text-[#52525B]"
            data-testid="profile-overline"
          >
            Profile registry
          </p>
          <h2
            className="mt-3 font-heading text-5xl font-black tracking-tighter"
            data-testid="profile-handle"
          >
            {handle}
          </h2>
          <p
            className="mt-4 max-w-2xl text-sm leading-6 text-[#52525B]"
            data-testid="profile-bio"
          >
            {bio}
          </p>
          <div
            className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4"
            data-testid="profile-stats-grid"
          >
            <div className="border border-black/10 bg-white p-4" data-testid="profile-address-box">
              <p className="text-xs uppercase tracking-[0.18em] text-[#52525B]">Address</p>
              <p className="mt-2 font-mono text-sm" data-testid="profile-address">
                {addressDisplay}
              </p>
            </div>
            <div className="border border-black/10 bg-white p-4" data-testid="profile-followers-box">
              <p className="text-xs uppercase tracking-[0.18em] text-[#52525B]">Followers</p>
              <p className="mt-2 font-mono text-lg font-black" data-testid="profile-followers">
                {followersDisplay}
              </p>
            </div>
            <div className="border border-black/10 bg-white p-4" data-testid="profile-following-box">
              <p className="text-xs uppercase tracking-[0.18em] text-[#52525B]">Following</p>
              <p className="mt-2 font-mono text-lg font-black" data-testid="profile-following">
                {followingDisplay}
              </p>
            </div>
            <div className="border border-black/10 bg-white p-4" data-testid="profile-trust-box">
              <p className="text-xs uppercase tracking-[0.18em] text-[#52525B]">Trust</p>
              <p className="mt-2 font-mono text-lg font-black" data-testid="profile-trust">
                {trustDisplay}
              </p>
            </div>
          </div>
        </div>

        <div
          className="border border-black bg-black p-6 text-white"
          data-testid="agent-policy-card"
        >
          <Bot className="h-7 w-7 text-[#0022FF]" />
          <h3
            className="mt-5 font-heading text-3xl font-black tracking-tight"
            data-testid="agent-policy-title"
          >
            MCP agent policy
          </h3>
          <p className="mt-2 text-sm text-white/70" data-testid="agent-policy-copy">
            Claude Desktop runs on the user&rsquo;s machine. Ori only stores the rulebook: caps, allowed tools, revoke, and kill switch.
          </p>
          <div className="mt-6">
            <div className="mb-3 flex justify-between font-mono text-sm">
              <span data-testid="agent-limit-label">Daily cap</span>
              <span data-testid="agent-limit-value">{agentLimit[0]} INIT</span>
            </div>
            <Slider
              value={agentLimit}
              onValueChange={setAgentLimit}
              onValueCommit={handleAgentLimitCommit}
              max={500}
              step={10}
              // Disable the slider entirely when no default agent address
              // is configured. Otherwise users drag, see no effect, and
              // assume the slider is broken — it just silently no-ops in
              // handleAgentLimitCommit.
              disabled={busy || !DEFAULT_AGENT_ADDRESS}
              className="[&_[role=slider]]:rounded-none [&_[role=slider]]:bg-white disabled:opacity-50"
              data-testid="agent-limit-slider"
            />
            {!DEFAULT_AGENT_ADDRESS && (
              <p
                className="mt-2 font-mono text-[11px] uppercase tracking-[0.2em] text-white/70"
                data-testid="agent-limit-chip"
              >
                Use the “Set agent spending policy” action below to authorize
                an agent — the slider commits to that address once configured.
              </p>
            )}
          </div>
          <div
            className="mt-6 flex items-center justify-between border border-white/20 p-4"
            data-testid="privacy-row"
          >
            <span className="flex items-center gap-2 text-sm" data-testid="privacy-label">
              <ShieldCheck className="h-4 w-4" /> Private follows
            </span>
            <Switch
              checked={privateFollows}
              onCheckedChange={handlePrivacyToggle}
              disabled={busy}
              className="data-[state=checked]:bg-[#0022FF]"
              data-testid="privacy-switch"
            />
          </div>
          <p
            className="mt-2 font-mono text-[11px] uppercase tracking-[0.2em] text-white/40"
            data-testid="privacy-chip"
          >
            Saves on next tx
          </p>

          <div className="mt-4 space-y-3" data-testid="authorized-agent-list">
            {agentActions.isLoading && (
              <p
                className="font-mono text-xs text-white/60"
                data-testid="authorized-agent-loading"
              >
                Loading agents…
              </p>
            )}
            {!agentActions.isLoading && distinctAgents.length === 0 && (
              <p
                className="font-mono text-xs text-white/60"
                data-testid="authorized-agent-empty"
              >
                No agents yet
              </p>
            )}
            {distinctAgents.map((agent) => (
              <div
                key={agent.agentAddr}
                className="border border-white/20 p-4"
                data-testid={`profile-authorized-agent-${agent.agentAddr}`}
              >
                <p
                  className="font-heading text-lg font-bold"
                  data-testid={`profile-authorized-agent-name-${agent.agentAddr}`}
                >
                  Authorized agent
                </p>
                <p
                  className="font-mono text-xs text-white/60"
                  data-testid={`profile-authorized-agent-address-${agent.agentAddr}`}
                >
                  {shortenAddress(agent.agentAddr)}
                </p>
                <p
                  className="mt-2 font-mono text-xs text-[#00C566]"
                  data-testid={`profile-authorized-agent-status-${agent.agentAddr}`}
                >
                  Active via MCP
                </p>
                <p
                  className="mt-3 text-xs text-white/70"
                  data-testid={`profile-authorized-agent-methods-${agent.agentAddr}`}
                >
                  Last tool: {agent.lastTool}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div
        className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-4"
        data-testid="profile-secondary-grid"
      >
        {/* Achievements */}
        <article
          className="border border-black/10 bg-white p-6"
          data-testid="achievements-card"
        >
          <Trophy className="h-6 w-6 text-[#FFB800]" />
          <h3
            className="mt-5 font-heading text-2xl font-black tracking-tight"
            data-testid="achievements-title"
          >
            Achievements
          </h3>
          <div className="mt-4 space-y-3">
            {badges.isLoading && (
              <p
                className="font-mono text-xs text-[#52525B]"
                data-testid="achievements-loading"
              >
                Loading badges…
              </p>
            )}
            {!badges.isLoading && (badges.data?.length ?? 0) === 0 && (
              <p
                className="font-mono text-xs text-[#52525B]"
                data-testid="achievements-empty"
              >
                No badges yet — keep playing.
              </p>
            )}
            {(badges.data ?? []).map((badge) => {
              const id = `${badge.badgeType}-${badge.level}`
              return (
                <div
                  key={id}
                  className="border border-black/10 p-3"
                  data-testid={`achievement-${id}`}
                >
                  <p
                    className="flex items-center gap-2 font-semibold"
                    data-testid={`achievement-name-${id}`}
                  >
                    <BadgeCheck className="h-4 w-4 text-[#0022FF]" />
                    {badge.badgeType} L{badge.level}
                  </p>
                </div>
              )
            })}
          </div>
        </article>

        {/* Quests */}
        <article
          className="border border-black/10 bg-white p-6"
          data-testid="quests-card"
        >
          <Bell className="h-6 w-6 text-[#0022FF]" />
          <h3
            className="mt-5 font-heading text-2xl font-black tracking-tight"
            data-testid="quests-title"
          >
            Quests
          </h3>
          {quests.data && (
            <p
              className="mt-2 font-mono text-xs text-[#52525B]"
              data-testid="quests-summary"
            >
              Level {quests.data.level} · {quests.data.totalXp} XP
            </p>
          )}
          <div className="mt-4 space-y-4">
            {quests.isLoading && (
              <p className="font-mono text-xs text-[#52525B]" data-testid="quests-loading">
                Loading quests…
              </p>
            )}
            {!quests.isLoading && (quests.data?.entries.length ?? 0) === 0 && (
              <p className="font-mono text-xs text-[#52525B]" data-testid="quests-empty">
                No active quests.
              </p>
            )}
            {(quests.data?.entries ?? []).map((quest, index) => {
              const pct =
                quest.threshold > 0
                  ? Math.min(100, (quest.progress / quest.threshold) * 100)
                  : 0
              return (
                <div key={quest.id} data-testid={`quest-${index}`}>
                  <div className="mb-2 flex justify-between text-sm">
                    <span data-testid={`quest-title-${index}`}>{quest.title}</span>
                    <span
                      className="font-mono"
                      data-testid={`quest-progress-${index}`}
                    >
                      {quest.progress}/{quest.threshold}
                    </span>
                  </div>
                  <Progress
                    value={pct}
                    className="rounded-none bg-black/10"
                    data-testid={`quest-progress-bar-${index}`}
                  />
                  <p
                    className="mt-1 font-mono text-[11px] text-[#52525B]"
                    data-testid={`quest-xp-${index}`}
                  >
                    +{quest.xp} XP
                  </p>
                </div>
              )
            })}
          </div>
        </article>

        {/* Merchant + links */}
        <article
          className="border border-black/10 bg-white p-6"
          data-testid="links-merchant-card"
        >
          <Store className="h-6 w-6 text-[#0022FF]" />
          <h3
            className="mt-5 font-heading text-2xl font-black tracking-tight"
            data-testid="merchant-title"
          >
            Merchant + links
          </h3>
          {(profile.data?.links?.length ?? 0) === 0 ? (
            <>
              <Button
                variant="ghost"
                disabled
                className="mt-3 h-auto w-full justify-start rounded-none border border-black/10 px-3 py-3"
                data-testid="merchant-link-empty"
              >
                <LinkIcon className="h-4 w-4" />
                No links yet
              </Button>
            </>
          ) : (
            (profile.data!.links).map((link, idx) => (
              <Button
                key={`${link.label}-${idx}`}
                variant="ghost"
                asChild
                className="mt-3 h-auto w-full justify-start rounded-none border border-black/10 px-3 py-3 hover:bg-black hover:text-white"
                data-testid={`merchant-link-${idx}`}
              >
                <a href={link.url} target="_blank" rel="noreferrer noopener">
                  <LinkIcon className="h-4 w-4" />
                  {link.label}
                </a>
              </Button>
            ))
          )}
        </article>

        {/* Notifications */}
        <article
          className="border border-black/10 bg-white p-6"
          data-testid="notifications-card"
        >
          <Bell className="h-6 w-6 text-[#0022FF]" />
          <h3
            className="mt-5 font-heading text-2xl font-black tracking-tight"
            data-testid="notifications-title"
          >
            Notifications
          </h3>
          <div className="mt-5 space-y-3">
            <div
              className="flex items-center justify-between border border-black/10 p-3"
              data-testid="push-notification-row"
            >
              <span className="text-sm" data-testid="push-notification-label">
                Phone push
              </span>
              <Switch
                checked={pushEnabled}
                onCheckedChange={(next) => {
                  setPushEnabled(next)
                  void (next ? ensurePushSubscription() : unsubscribePush()).then(() => {
                    toast.success(next ? 'Push notifications registered' : 'Push notifications removed')
                  })
                }}
                className="data-[state=checked]:bg-[#0022FF]"
                data-testid="push-notification-switch"
              />
            </div>
            <div
              className="flex items-center justify-between border border-black/10 p-3"
              data-testid="auto-sign-row"
            >
              <span className="text-sm" data-testid="auto-sign-label">
                One-tap auto-sign
              </span>
              <Switch
                checked={autoSignEnabled}
                onCheckedChange={handleAutoSignToggle}
                className="data-[state=checked]:bg-[#0022FF]"
                data-testid="auto-sign-switch"
              />
            </div>
            <p className="font-mono text-xs text-[#52525B]" data-testid="auto-sign-limit">
              Small tx limit: 5 INIT
            </p>
          </div>
        </article>
      </div>

      <Tabs defaultValue="identity" className="mt-8" data-testid="profile-tabs">
        <TabsList
          className="flex h-auto w-full flex-wrap justify-start rounded-none border border-black/10 bg-white p-0"
          data-testid="profile-tabs-list"
        >
          {profileActions.map((section) => (
            <TabsTrigger
              key={section.id}
              value={section.id}
              className="rounded-none border-r border-black/10 px-4 py-3 data-[state=active]:bg-[#0022FF] data-[state=active]:text-white"
              data-testid={`profile-tab-${section.id}`}
            >
              {section.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {profileActions.map((section) => {
          return (
            <TabsContent
              key={section.id}
              value={section.id}
              className="mt-4"
              data-testid={`profile-tab-content-${section.id}`}
            >
              <div
                className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
                data-testid={`profile-actions-grid-${section.id}`}
              >
                {section.actions.map((action) => (
                  <ActionCard
                    key={action.id}
                    scope={`profile-${section.id}`}
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
        <p
          className="mt-6 font-mono text-sm text-[#0022FF]"
          data-testid="profile-recent-action"
        >
          {recentAction.title} dispatched.
        </p>
      )}

      <ActionDialog
        action={modalAction}
        onClose={() => setModalAction(null)}
        onComplete={async (record) => {
          setRecentAction(record)
          await dispatchAction(record, record.values)
        }}
      />
    </section>
  )
}
