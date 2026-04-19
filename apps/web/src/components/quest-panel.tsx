'use client'

/**
 * QuestPanel — progress-bar list of quests + XP total + level.
 *
 * Quests are defined server-side (QUESTS in routes/quests.ts). Progress
 * is computed from UserStats; completions auto-record when thresholds
 * are crossed. No tokens — XP totals are derived.
 *
 * Attribution: Hunch's QuestPanel model.
 */
import { useQuery } from '@tanstack/react-query'
import {
  Zap,
  Heart,
  Gift,
  UserPlus,
  Trophy,
  Split,
  Sparkles,
  Check,
  type LucideIcon,
} from 'lucide-react'
import { getQuests, type Quest, type QuestsResponse } from '@/lib/api'

const ICONS: Record<string, LucideIcon> = {
  zap: Zap,
  heart: Heart,
  gift: Gift,
  'user-plus': UserPlus,
  trophy: Trophy,
  split: Split,
  sparkles: Sparkles,
}

type Props = {
  address: string
  title?: string
}

export function QuestPanel({ address, title = 'Quests' }: Props) {
  const { data, isLoading } = useQuery<QuestsResponse>({
    queryKey: ['quests', address],
    queryFn: () => getQuests(address),
    enabled: Boolean(address),
    staleTime: 30_000,
  })

  return (
    <section className="rounded-2xl border border-border bg-muted/30 p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="text-[11px] text-muted-foreground">
            {data ? `Level ${data.level} · ${data.totalXp} / ${data.maxXp} XP` : 'Loading…'}
          </p>
        </div>
      </div>

      {data && (
        <div className="mb-3 h-1.5 w-full rounded-full bg-background overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-success"
            style={{ width: `${Math.min(100, (data.totalXp / Math.max(1, data.maxXp)) * 100)}%` }}
          />
        </div>
      )}

      {isLoading && <div className="text-xs text-muted-foreground">Loading quests…</div>}

      {data && (
        <ul className="space-y-2">
          {data.entries.map((q) => (
            <QuestRow key={q.id} quest={q} />
          ))}
        </ul>
      )}
    </section>
  )
}

function QuestRow({ quest }: { quest: Quest }) {
  const Icon = ICONS[quest.icon] ?? Sparkles
  const pct = Math.min(100, (quest.progress / Math.max(1, quest.threshold)) * 100)
  return (
    <li
      className={
        'rounded-xl border px-3 py-2 ' +
        (quest.completed
          ? 'border-success/30 bg-success/5'
          : 'border-border bg-background')
      }
    >
      <div className="flex items-center gap-3">
        <div
          className={
            'w-8 h-8 rounded-lg inline-flex items-center justify-center flex-none ' +
            (quest.completed ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground')
          }
        >
          {quest.completed ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium truncate">{quest.title}</span>
            <span className="text-[11px] font-mono text-muted-foreground">+{quest.xp} XP</span>
          </div>
          <p className="text-[11px] text-muted-foreground truncate">{quest.description}</p>
          <div className="mt-1 flex items-center gap-2">
            <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
              <div
                className={
                  'h-full ' + (quest.completed ? 'bg-success' : 'bg-primary/70')
                }
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-[11px] font-mono text-muted-foreground">
              {quest.progress}/{quest.threshold}
            </span>
          </div>
        </div>
      </div>
    </li>
  )
}
