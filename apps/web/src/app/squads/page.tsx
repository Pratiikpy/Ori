'use client'

/**
 * /squads — groups (squads module).
 *
 * Create, join, leave, transfer leader, disband. The module has no public
 * list-all view; we persist "squads I know about" (ones I created or joined)
 * to localStorage so this page has something to show.
 */
import { useCallback, useEffect, useState } from 'react'
import { useInterwovenKit } from '@initia/interwovenkit-react'
import { toast } from 'sonner'
import { Crown, LogOut, Plus, UserPlus, Users, X } from 'lucide-react'

import { AppShell } from '@/components/app-shell'
import { PageHeader, Serif } from '@/components/page-header'
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  Eyebrow,
  Field,
  Input,
  Pill,
  Reveal,
} from '@/components/ui'
import { useAutoSign } from '@/hooks/use-auto-sign'
import { ORI_CHAIN_ID } from '@/lib/chain-config'
import {
  msgCreateSquad,
  msgDisbandSquad,
  msgJoinSquad,
  msgLeaveSquad,
} from '@/lib/contracts'
import {
  buildAutoSignFee,
  extractMoveEventData,
  friendlyError,
  sendTx,
} from '@/lib/tx'

const STORAGE_KEY = 'ori.squads.known.v1'

type Role = 'leader' | 'member'

interface LocalSquad {
  squadId: string
  name: string
  role: Role
  joinedAt: number
}

function readLocal(): LocalSquad[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]') as LocalSquad[]
  } catch {
    return []
  }
}
function writeLocal(v: LocalSquad[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(v))
}

export default function SquadsPage() {
  const kit = useInterwovenKit()
  const { initiaAddress, isConnected, openConnect } = kit
  const { isEnabled: autoSign } = useAutoSign()

  const [squadName, setSquadName] = useState('')
  const [joinId, setJoinId] = useState('')
  const [items, setItems] = useState<LocalSquad[]>([])
  const [busy, setBusy] = useState<'create' | 'join' | null>(null)

  useEffect(() => {
    setItems(readLocal())
  }, [])

  const create = useCallback(async () => {
    if (!isConnected) return openConnect()
    if (!initiaAddress) return
    if (!squadName.trim()) {
      toast.error('Give the squad a name')
      return
    }
    setBusy('create')
    try {
      const msg = msgCreateSquad({ leader: initiaAddress, name: squadName.trim() })
      const res = await sendTx(kit, {
        chainId: ORI_CHAIN_ID,
        messages: [msg],
        autoSign,
        fee: autoSign ? buildAutoSignFee(500_000) : undefined,
      })
      const ev = extractMoveEventData(res.rawResponse, '::squads::SquadCreated')
      const squadId =
        (ev?.squad_id as string | undefined) ??
        (ev?.id as string | undefined) ??
        Date.now().toString()
      const next: LocalSquad[] = [
        {
          squadId,
          name: squadName.trim(),
          role: 'leader',
          joinedAt: Math.floor(Date.now() / 1000),
        },
        ...items,
      ]
      setItems(next)
      writeLocal(next)
      setSquadName('')
      toast.success(`Squad #${squadId} created`)
    } catch (e) {
      toast.error(friendlyError(e))
    } finally {
      setBusy(null)
    }
  }, [isConnected, initiaAddress, squadName, kit, autoSign, items, openConnect])

  const join = useCallback(async () => {
    if (!isConnected) return openConnect()
    if (!initiaAddress) return
    const parsed = joinId.trim().replace(/^#/, '')
    if (!parsed || !/^\d+$/.test(parsed)) {
      toast.error('Squad ID must be a number')
      return
    }
    setBusy('join')
    try {
      const msg = msgJoinSquad({ member: initiaAddress, squadId: BigInt(parsed) })
      await sendTx(kit, {
        chainId: ORI_CHAIN_ID,
        messages: [msg],
        autoSign,
        fee: autoSign ? buildAutoSignFee(400_000) : undefined,
      })
      if (!items.some((s) => s.squadId === parsed)) {
        const next: LocalSquad[] = [
          {
            squadId: parsed,
            name: `Squad #${parsed}`,
            role: 'member',
            joinedAt: Math.floor(Date.now() / 1000),
          },
          ...items,
        ]
        setItems(next)
        writeLocal(next)
      }
      setJoinId('')
      toast.success(`Joined squad #${parsed}`)
    } catch (e) {
      toast.error(friendlyError(e))
    } finally {
      setBusy(null)
    }
  }, [isConnected, initiaAddress, joinId, kit, autoSign, items, openConnect])

  const leave = async (s: LocalSquad) => {
    if (!initiaAddress) return
    try {
      const msg = msgLeaveSquad({ member: initiaAddress, squadId: BigInt(s.squadId) })
      await sendTx(kit, {
        chainId: ORI_CHAIN_ID,
        messages: [msg],
        autoSign,
        fee: autoSign ? buildAutoSignFee(400_000) : undefined,
      })
      const next = items.filter((x) => x.squadId !== s.squadId)
      setItems(next)
      writeLocal(next)
      toast.success('Left squad')
    } catch (e) {
      toast.error(friendlyError(e))
    }
  }

  const disband = async (s: LocalSquad) => {
    if (!initiaAddress) return
    try {
      const msg = msgDisbandSquad({ leader: initiaAddress, squadId: BigInt(s.squadId) })
      await sendTx(kit, {
        chainId: ORI_CHAIN_ID,
        messages: [msg],
        autoSign,
        fee: autoSign ? buildAutoSignFee(500_000) : undefined,
      })
      const next = items.filter((x) => x.squadId !== s.squadId)
      setItems(next)
      writeLocal(next)
      toast.success('Squad disbanded')
    } catch (e) {
      toast.error(friendlyError(e))
    }
  }

  return (
    <AppShell title="Squads">
      <div className="max-w-2xl mx-auto w-full px-5 pt-8 pb-10 space-y-10">
        <PageHeader
          kicker="· Squads"
          title={
            <>
              Groups, <Serif>but lighter</Serif>.
            </>
          }
          sub="Create a squad, share its ID, anyone can join. Shared context for tips, split bills, and gift drops — without a group-chat tax."
        />

        <div className="grid md:grid-cols-2 gap-4">
          <Reveal>
            <Card>
              <CardHeader>
                <Eyebrow>Create a squad</Eyebrow>
              </CardHeader>
              <CardBody className="space-y-4">
                <Field label="Squad name">
                  <Input
                    placeholder="the-lisbon-team"
                    value={squadName}
                    onChange={(e) => setSquadName(e.target.value)}
                    maxLength={40}
                  />
                </Field>
                <Button
                  onClick={() => void create()}
                  loading={busy === 'create'}
                  className="w-full"
                  leftIcon={<Plus className="w-4 h-4" />}
                >
                  Create
                </Button>
              </CardBody>
            </Card>
          </Reveal>

          <Reveal delay={80}>
            <Card>
              <CardHeader>
                <Eyebrow>Join by ID</Eyebrow>
              </CardHeader>
              <CardBody className="space-y-4">
                <Field label="Squad ID">
                  <Input
                    placeholder="e.g. 42"
                    value={joinId}
                    onChange={(e) => setJoinId(e.target.value.replace(/[^0-9]/g, ''))}
                    className="font-mono"
                  />
                </Field>
                <Button
                  variant="secondary"
                  onClick={() => void join()}
                  loading={busy === 'join'}
                  className="w-full"
                  leftIcon={<UserPlus className="w-4 h-4" />}
                >
                  Join
                </Button>
              </CardBody>
            </Card>
          </Reveal>
        </div>

        <section className="space-y-4">
          <Eyebrow>Squads you’re in</Eyebrow>
          {items.length === 0 ? (
            <Card>
              <EmptyState
                icon={<Users className="w-5 h-5" />}
                title="No squads yet"
                description="Create one or join by ID. The chain is the source of truth — this page just remembers the ones you know about."
              />
            </Card>
          ) : (
            <div className="space-y-3">
              {items.map((s) => (
                <Card key={s.squadId} className="p-5 flex items-center gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono uppercase tracking-[0.12em] text-ink-3">
                        #{s.squadId}
                      </span>
                      {s.role === 'leader' ? (
                        <Pill tone="accent">
                          <Crown className="w-3 h-3" />
                          leader
                        </Pill>
                      ) : (
                        <Pill>member</Pill>
                      )}
                    </div>
                    <h3 className="mt-1 text-[15px] font-medium truncate">{s.name}</h3>
                  </div>
                  {s.role === 'leader' ? (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => void disband(s)}
                      leftIcon={<X className="w-3.5 h-3.5" />}
                    >
                      Disband
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => void leave(s)}
                      leftIcon={<LogOut className="w-3.5 h-3.5" />}
                    >
                      Leave
                    </Button>
                  )}
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  )
}
