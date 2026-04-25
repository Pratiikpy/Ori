'use client'

/**
 * FollowButton — call `follow_graph::follow` / `::unfollow` on the Ori rollup.
 *
 * Follow state is read from the backend (which indexes on-chain events). After
 * a mutation, we optimistically flip the local state and invalidate the
 * cached follow-stats + following check so the counters stay in sync.
 */
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useInterwovenKit } from '@initia/interwovenkit-react'
import { UserPlus, UserMinus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { ORI_CHAIN_ID } from '@/lib/chain-config'
import { msgFollow, msgUnfollow } from '@/lib/contracts'
import { buildAutoSignFee, sendTx } from '@/lib/tx'
import { useAutoSign } from '@/hooks/use-auto-sign'
import { checkFollowing } from '@/lib/api'

type Props = {
  target: string
  targetDisplayName: string
  className?: string
}

export function FollowButton({ target, targetDisplayName, className }: Props) {
  const kit = useInterwovenKit()
  const { initiaAddress, isConnected, openConnect } = kit
  const { isEnabled: autoSign } = useAutoSign()
  const qc = useQueryClient()
  const [optimistic, setOptimistic] = useState<boolean | null>(null)

  const { data: isFollowing, isLoading } = useQuery({
    queryKey: ['follow-check', initiaAddress, target],
    queryFn: () => checkFollowing(initiaAddress!, target),
    enabled: Boolean(initiaAddress && target && initiaAddress !== target),
    staleTime: 15_000,
  })

  const currentFollowing = optimistic ?? isFollowing ?? false

  const mutation = useMutation({
    mutationFn: async () => {
      if (!initiaAddress) throw new Error('Not connected')
      const msg = currentFollowing
        ? msgUnfollow({ follower: initiaAddress, target })
        : msgFollow({ follower: initiaAddress, target })
      const tx = await sendTx(kit, {
        chainId: ORI_CHAIN_ID,
        messages: [msg],
        autoSign,
        fee: autoSign ? buildAutoSignFee(300_000) : undefined,
      })
      return tx.txHash
    },
    onMutate: () => setOptimistic(!currentFollowing),
    onSuccess: () => {
      toast.success(currentFollowing ? `Followed ${targetDisplayName}` : `Unfollowed ${targetDisplayName}`)
      void qc.invalidateQueries({ queryKey: ['follow-check', initiaAddress, target] })
      void qc.invalidateQueries({ queryKey: ['follow-stats', target] })
      void qc.invalidateQueries({ queryKey: ['follow-stats', initiaAddress] })
    },
    onError: (e: unknown) => {
      setOptimistic(null)
      toast.error(e instanceof Error ? e.message : 'Failed')
    },
  })

  if (!isConnected) {
    return (
      <button
        onClick={() => openConnect()}
        className={
          'inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2 bg-muted border border-border text-sm font-medium hover:border-primary/40 ' +
          (className ?? '')
        }
      >
        <UserPlus className="w-4 h-4" />
        Follow
      </button>
    )
  }
  if (!initiaAddress || initiaAddress === target) return null

  return (
    <button
      onClick={() => mutation.mutate()}
      disabled={mutation.isPending || isLoading}
      className={
        'inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium transition disabled:opacity-50 ' +
        (currentFollowing
          ? 'bg-muted border border-border text-foreground hover:border-danger/40 hover:text-danger'
          : 'bg-primary text-primary-foreground hover:opacity-90') +
        ' ' +
        (className ?? '')
      }
    >
      {mutation.isPending ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : currentFollowing ? (
        <UserMinus className="w-4 h-4" />
      ) : (
        <UserPlus className="w-4 h-4" />
      )}
      {currentFollowing ? 'Following' : 'Follow'}
    </button>
  )
}
