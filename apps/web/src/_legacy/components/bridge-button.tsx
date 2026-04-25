'use client'

/**
 * BridgeButton — opens the InterwovenKit bridge drawer with Ori's rollup
 * pre-selected as the destination.
 *
 * Usage:
 *   <BridgeButton variant="primary" /> in onboarding
 *   <BridgeButton variant="ghost" />   in landing / settings
 *
 * The bridge modal is provided by InterwovenKit; we just hand it sane defaults.
 * This wires the `interwoven-bridge` native feature to a real UX surface —
 * previously the config existed but `openBridge` was never called.
 */
import { useInterwovenKit } from '@initia/interwovenkit-react'
import { ArrowDownToLine } from 'lucide-react'
import {
  BRIDGE_SRC_CHAIN_ID,
  BRIDGE_SRC_DENOM,
  ORI_CHAIN_ID,
  ORI_DENOM,
} from '@/lib/chain-config'

type Props = {
  variant?: 'primary' | 'ghost' | 'inline'
  label?: string
  className?: string
}

export function BridgeButton({ variant = 'primary', label = 'Bridge in', className = '' }: Props) {
  const { openBridge, isConnected, openConnect } = useInterwovenKit()

  const handleClick = () => {
    if (!isConnected) {
      openConnect()
      return
    }
    openBridge({
      srcChainId: BRIDGE_SRC_CHAIN_ID,
      srcDenom: BRIDGE_SRC_DENOM,
      dstChainId: ORI_CHAIN_ID,
      dstDenom: ORI_DENOM,
    })
  }

  const base = 'inline-flex items-center justify-center gap-2 font-medium transition'
  const style =
    variant === 'primary'
      ? 'rounded-2xl py-3 px-5 bg-primary text-primary-foreground hover:opacity-90'
      : variant === 'inline'
        ? 'rounded-xl px-3 py-2 text-sm bg-muted border border-border hover:bg-border'
        : 'rounded-full px-4 h-9 text-sm bg-muted border border-border text-muted-foreground hover:text-foreground'

  return (
    <button onClick={handleClick} className={`${base} ${style} ${className}`} type="button">
      <ArrowDownToLine className="w-4 h-4" />
      {label}
    </button>
  )
}
