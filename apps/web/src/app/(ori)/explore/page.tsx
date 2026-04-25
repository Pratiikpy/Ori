'use client'

/**
 * Explore page — verbatim port of ui-ref-orii/frontend/src/pages/Explore.jsx.
 *
 * Real wiring (TODO):
 *   discover → recent index from event listener.
 *   leaderboards → on-chain aggregation queries.
 *   oraclePrices → Slinky oracle reads (live ticking is mocked here with
 *     a sin-based drift; replace with WebSocket subscription).
 *   squad actions → squads.move via lib/contracts.
 */
import { useEffect, useState } from 'react'
import { Activity, Compass, UsersRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ActionCard, ActionDialog, type Action, type ActionRecord } from '@/components/action-dialog'
import { discover, leaderboards, oraclePrices } from '@/data/ori-data'

const squadActions: Action[] = [
  { id: 'create-squad', title: 'Create squad', contract: 'squads.move', fields: ['Squad name', 'Description'] },
  { id: 'join-squad', title: 'Join squad', contract: 'squads.move', fields: ['Squad ID', 'Invite code'] },
  { id: 'leave-squad', title: 'Leave squad', contract: 'squads.move', fields: ['Squad ID'] },
  { id: 'disband-squad', title: 'Disband squad', contract: 'squads.move', fields: ['Squad ID', 'Confirm phrase'] },
  { id: 'transfer-leadership', title: 'Transfer leadership', contract: 'squads.move', fields: ['Squad ID', 'New leader'] },
]

export default function ExplorePage() {
  const [modalAction, setModalAction] = useState<Action | null>(null)
  const [recentAction, setRecentAction] = useState<ActionRecord | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const timer = window.setInterval(() => setTick((value) => value + 1), 3500)
    return () => window.clearInterval(timer)
  }, [])

  const livePrices = oraclePrices.map((price, index) => {
    const numeric = Number(price.price.replace(/[$,]/g, ''))
    const drift = Math.sin((tick + index) / 2) * (index + 1) * 0.003
    const next = numeric * (1 + drift)
    return {
      ...price,
      price: `$${next.toLocaleString(undefined, {
        maximumFractionDigits: index < 2 ? 0 : 2,
      })}`,
    }
  })

  return (
    <section className="p-4 sm:p-6 lg:p-8" data-testid="explore-page">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3" data-testid="explore-discover-grid">
        {Object.entries(discover).map(([key, items]) => (
          <article
            key={key}
            className="border border-black/10 bg-white p-6"
            data-testid={`discover-card-${key}`}
          >
            <Compass className="h-6 w-6 text-[#0022FF]" />
            <h2
              className="mt-6 font-heading text-2xl font-black capitalize tracking-tight"
              data-testid={`discover-title-${key}`}
            >
              {key.replace(/([A-Z])/g, ' $1')}
            </h2>
            <div className="mt-5 space-y-3" data-testid={`discover-list-${key}`}>
              {(items as string[]).map((item) => (
                <Button
                  key={item}
                  variant="ghost"
                  className="h-auto w-full justify-start rounded-none border border-black/10 px-3 py-3 text-left hover:bg-black hover:text-white"
                  data-testid={`discover-item-${key}-${item.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                >
                  {item}
                </Button>
              ))}
            </div>
          </article>
        ))}
      </div>

      <Tabs defaultValue="leaderboards" className="mt-8" data-testid="explore-tabs">
        <TabsList
          className="flex h-auto flex-wrap justify-start rounded-none border border-black/10 bg-white p-0"
          data-testid="explore-tabs-list"
        >
          <TabsTrigger
            value="leaderboards"
            className="rounded-none border-r border-black/10 px-4 py-3 data-[state=active]:bg-[#0022FF] data-[state=active]:text-white"
            data-testid="explore-tab-leaderboards"
          >
            Leaderboards
          </TabsTrigger>
          <TabsTrigger
            value="oracle"
            className="rounded-none border-r border-black/10 px-4 py-3 data-[state=active]:bg-[#0022FF] data-[state=active]:text-white"
            data-testid="explore-tab-oracle"
          >
            Oracle prices
          </TabsTrigger>
          <TabsTrigger
            value="activity"
            className="rounded-none border-r border-black/10 px-4 py-3 data-[state=active]:bg-[#0022FF] data-[state=active]:text-white"
            data-testid="explore-tab-activity"
          >
            Activity
          </TabsTrigger>
          <TabsTrigger
            value="squads"
            className="rounded-none px-4 py-3 data-[state=active]:bg-[#0022FF] data-[state=active]:text-white"
            data-testid="explore-tab-squads"
          >
            Squads
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="leaderboards"
          className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3"
          data-testid="leaderboards-content"
        >
          {leaderboards.map((board) => (
            <article
              key={board.id}
              className="border border-black/10 bg-white p-6"
              data-testid={`leaderboard-${board.id}`}
            >
              <h2
                className="font-heading text-2xl font-black tracking-tight"
                data-testid={`leaderboard-title-${board.id}`}
              >
                {board.title}
              </h2>
              <ol className="mt-5 space-y-3">
                {board.rows.map((row, index) => (
                  <li
                    key={row}
                    className="font-mono text-sm"
                    data-testid={`leaderboard-row-${board.id}-${index}`}
                  >
                    {index + 1}. {row}
                  </li>
                ))}
              </ol>
            </article>
          ))}
        </TabsContent>

        <TabsContent
          value="oracle"
          className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5"
          data-testid="oracle-content"
        >
          {livePrices.map((price) => (
            <article
              key={price.id}
              className="border border-black/10 bg-white p-5"
              data-testid={`oracle-card-${price.id}`}
            >
              <p className="font-mono text-xs text-[#52525B]" data-testid={`oracle-pair-${price.id}`}>
                {price.pair} · live mock
              </p>
              <p className="mt-4 font-mono text-2xl font-black" data-testid={`oracle-price-${price.id}`}>
                {price.price}
              </p>
              <p
                className={`mt-2 font-mono text-sm ${
                  price.move.startsWith('-') ? 'text-[#FF3B30]' : 'text-[#00A858]'
                }`}
                data-testid={`oracle-move-${price.id}`}
              >
                {price.move}
              </p>
            </article>
          ))}
        </TabsContent>

        <TabsContent
          value="activity"
          className="mt-4 border border-black/10 bg-white p-6"
          data-testid="activity-content"
        >
          {[
            'mira.init purchased paywall #204',
            'nova.agent.init scheduled price prediction',
            'kai.init released subscription period',
            'rio.init claimed group gift',
          ].map((item, index) => (
            <div
              key={item}
              className="flex items-center gap-4 border-b border-black/10 py-4 last:border-b-0"
              data-testid={`activity-row-${index}`}
            >
              <Activity className="h-4 w-4 text-[#0022FF]" />
              <span className="text-sm" data-testid={`activity-text-${index}`}>
                {item}
              </span>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="squads" className="mt-4" data-testid="squads-content">
          <div
            className="mb-4 flex items-center gap-3 border border-black/10 bg-[#F5F5F5] p-5"
            data-testid="squad-summary-card"
          >
            <UsersRound className="h-5 w-5 text-[#0022FF]" />
            <span data-testid="squad-summary-text">
              Create groups, join crews, leave safely, disband, or transfer leadership.
            </span>
          </div>
          <div
            className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
            data-testid="squad-actions-grid"
          >
            {squadActions.map((action) => (
              <ActionCard
                key={action.id}
                scope="squads"
                action={action}
                onOpen={setModalAction}
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {recentAction && (
        <p className="mt-6 font-mono text-sm text-[#0022FF]" data-testid="explore-recent-action">
          {recentAction.title} simulated.
        </p>
      )}
      <ActionDialog
        action={modalAction}
        onClose={() => setModalAction(null)}
        onComplete={setRecentAction}
      />
    </section>
  )
}
