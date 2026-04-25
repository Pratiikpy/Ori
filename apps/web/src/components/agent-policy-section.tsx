'use client'

import { useCallback, useEffect, useState } from 'react'
import { useInterwovenKit } from '@initia/interwovenkit-react'
import { ShieldCheck, ShieldOff, Loader2, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { getAgentPolicy, type AgentPolicyView } from '@/lib/api'
import { msgRevokeAgent, msgSetAgentPolicy } from '@/lib/contracts'
import { buildAutoSignFee, friendlyError, sendTx } from '@/lib/tx'
import { useAutoSign } from '@/hooks/use-auto-sign'
import { GAS_LIMITS, ORI_CHAIN_ID, ORI_DECIMALS, ORI_SYMBOL } from '@/lib/chain-config'

const DEFAULT_AGENT_SIGNER =
  process.env.NEXT_PUBLIC_MCP_SIGNER_ADDRESS ?? ''

function toBaseUnits(decimal: string, decimals = ORI_DECIMALS): bigint {
  const [whole, fracRaw = ''] = decimal.split('.') as [string, string?]
  const frac = (fracRaw + '0'.repeat(decimals)).slice(0, decimals)
  return BigInt(whole || '0') * 10n ** BigInt(decimals) + BigInt(frac || '0')
}

function fromBaseUnits(base: string | bigint, decimals = ORI_DECIMALS): string {
  const n = typeof base === 'bigint' ? base : BigInt(base)
  const whole = n / 10n ** BigInt(decimals)
  const frac = n % 10n ** BigInt(decimals)
  const fracStr = frac.toString().padStart(decimals, '0').replace(/0+$/, '')
  return fracStr ? `${whole}.${fracStr}` : whole.toString()
}

export function AgentPolicySection() {
  const kit = useInterwovenKit()
  const { isEnabled: autoSign } = useAutoSign()

  const [agentAddr, setAgentAddr] = useState(DEFAULT_AGENT_SIGNER)
  const [dailyCapInput, setDailyCapInput] = useState('5.0')
  const [policy, setPolicy] = useState<AgentPolicyView | null>(null)
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState<'set' | 'revoke' | null>(null)

  const owner = kit.initiaAddress

  const refresh = useCallback(async () => {
    if (!owner || !agentAddr) {
      setPolicy(null)
      return
    }
    setLoading(true)
    try {
      const p = await getAgentPolicy(owner, agentAddr)
      setPolicy(p)
      if (p) {
        setDailyCapInput(fromBaseUnits(p.dailyCap))
      }
    } catch (err) {
      // Invalid address or network error -- render empty state rather than
      // throwing; the input box lets the user fix it.
      setPolicy(null)
      // eslint-disable-next-line no-console
      console.warn('[agent-policy] read failed', err)
    } finally {
      setLoading(false)
    }
  }, [owner, agentAddr])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const onSetPolicy = useCallback(async () => {
    if (!owner) {
      toast.error('Connect your wallet first.')
      return
    }
    if (!agentAddr.startsWith('init1')) {
      toast.error('Agent address must start with init1.')
      return
    }
    const cap = toBaseUnits(dailyCapInput)
    if (cap === 0n) {
      toast.error('Daily cap must be greater than zero.')
      return
    }
    setBusy('set')
    try {
      const msg = msgSetAgentPolicy({ sender: owner, agent: agentAddr, dailyCap: cap })
      const res = await sendTx(kit, {
        chainId: ORI_CHAIN_ID,
        messages: [msg],
        autoSign,
        fee: autoSign ? buildAutoSignFee(GAS_LIMITS.simpleTx) : undefined,
        memo: 'ori set_agent_policy',
      })
      toast.success(`Policy set · ${res.txHash.slice(0, 10)}…`)
      await refresh()
    } catch (err) {
      toast.error(friendlyError(err))
    } finally {
      setBusy(null)
    }
  }, [agentAddr, autoSign, dailyCapInput, kit, owner, refresh])

  const onRevoke = useCallback(async () => {
    if (!owner) {
      toast.error('Connect your wallet first.')
      return
    }
    if (!agentAddr.startsWith('init1')) {
      toast.error('Agent address must start with init1.')
      return
    }
    if (
      !window.confirm(
        `Revoke agent ${agentAddr.slice(0, 14)}…?\n\nThe agent will be disabled from spending on your behalf until you re-enable its policy.`,
      )
    ) {
      return
    }
    setBusy('revoke')
    try {
      const msg = msgRevokeAgent({ sender: owner, agent: agentAddr })
      const res = await sendTx(kit, {
        chainId: ORI_CHAIN_ID,
        messages: [msg],
        autoSign,
        fee: autoSign ? buildAutoSignFee(GAS_LIMITS.simpleTx) : undefined,
        memo: 'ori revoke_agent',
      })
      toast.success(`Agent revoked · ${res.txHash.slice(0, 10)}…`)
      await refresh()
    } catch (err) {
      toast.error(friendlyError(err))
    } finally {
      setBusy(null)
    }
  }, [agentAddr, autoSign, kit, owner, refresh])

  const spentPct =
    policy && BigInt(policy.dailyCap) > 0n
      ? Number((BigInt(policy.spentToday) * 10000n) / BigInt(policy.dailyCap)) / 100
      : 0

  return (
    <section className="rounded-2xl border border-border bg-muted/30 p-4 space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold">Agent policy</h2>
          <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
            On-chain daily spending cap for an MCP signing key.{' '}
            <span className="font-medium text-foreground">Kill switch is instant.</span>{' '}
            Per Initia's Move module -- not a backend trust boundary.
          </p>
        </div>
      </div>

      {/* Agent address */}
      <div>
        <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-1.5">
          Agent signer address
        </label>
        <input
          type="text"
          autoComplete="off"
          value={agentAddr}
          onChange={(e) => setAgentAddr(e.target.value.trim())}
          placeholder="init1…"
          className="w-full rounded-xl border border-border bg-background px-3 h-10 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      {/* Current status */}
      {loading ? (
        <div className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
          <Loader2 className="w-3 h-3 animate-spin" /> reading policy…
        </div>
      ) : policy ? (
        <div
          className={`rounded-xl border p-3 space-y-2 ${
            policy.active
              ? 'border-success/40 bg-success/10'
              : 'border-danger/40 bg-danger/10'
          }`}
        >
          <div className="flex items-center gap-2 text-sm font-semibold">
            {policy.active ? (
              <>
                <ShieldCheck className="w-4 h-4 text-success" /> Active
              </>
            ) : (
              <>
                <ShieldOff className="w-4 h-4 text-danger" /> Revoked
              </>
            )}
          </div>
          <div className="text-xs flex items-center justify-between">
            <span className="text-muted-foreground">Daily cap</span>
            <span className="font-mono font-medium">
              {fromBaseUnits(policy.dailyCap)} {ORI_SYMBOL}
            </span>
          </div>
          <div className="text-xs flex items-center justify-between">
            <span className="text-muted-foreground">Spent today</span>
            <span className="font-mono font-medium">
              {fromBaseUnits(policy.spentToday)} {ORI_SYMBOL}
            </span>
          </div>
          {/* Progress bar */}
          <div className="h-1.5 rounded-full bg-background overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                spentPct > 90 ? 'bg-danger' : spentPct > 60 ? 'bg-warning' : 'bg-success'
              }`}
              style={{ width: `${Math.min(100, spentPct)}%` }}
            />
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-background p-3 text-xs text-muted-foreground">
          No policy exists for this agent yet. Set a daily cap below to register.
        </div>
      )}

      {/* Daily cap input */}
      <div>
        <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-1.5">
          Daily cap ({ORI_SYMBOL})
        </label>
        <input
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={dailyCapInput}
          onChange={(e) => setDailyCapInput(e.target.value.replace(/[^0-9.]/g, ''))}
          placeholder="e.g. 5.0"
          className="w-full rounded-xl border border-border bg-background px-3 h-10 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => void onSetPolicy()}
          disabled={busy !== null || !owner}
          className="rounded-xl h-10 bg-primary text-primary-foreground text-sm font-medium transition hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {busy === 'set' ? 'Saving…' : policy ? 'Update cap' : 'Set policy'}
        </button>
        <button
          onClick={() => void onRevoke()}
          disabled={busy !== null || !owner || !policy?.active}
          className="rounded-xl h-10 bg-danger/15 border border-danger/40 text-danger text-sm font-medium transition hover:bg-danger/25 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-1.5"
        >
          <AlertTriangle className="w-4 h-4" />
          {busy === 'revoke' ? 'Revoking…' : 'REVOKE'}
        </button>
      </div>

      <p className="text-[11px] text-muted-foreground leading-relaxed">
        <span className="font-medium">Enforcement model:</span> the MCP server calls{' '}
        <span className="font-mono">agent_policy::pre_check_and_record</span> before every
        spend. If the cap is exceeded or the agent is revoked, the chain aborts the tx.
        Revoking is instant and on-chain -- no backend trust needed.
      </p>
    </section>
  )
}
