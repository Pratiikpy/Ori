'use client'

/**
 * Play page — verbatim port of ui-ref-orii/frontend/src/pages/Play.jsx.
 *
 * Real wiring (TODO):
 *   oraclePrices → Slinky oracle reads.
 *   wager actions → wager_escrow.move via lib/contracts.
 *   prediction markets → prediction_pool.move + lib/contracts.
 *   lucky pools → lucky_pool.move + lib/contracts.
 */
import { useState } from 'react'
import { Trophy } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ActionCard, ActionDialog, type Action, type ActionRecord } from '@/components/action-dialog'
import { oraclePrices, playTabs } from '@/data/ori-data'

export default function PlayPage() {
  const [modalAction, setModalAction] = useState<Action | null>(null)
  const [recentAction, setRecentAction] = useState<ActionRecord | null>(null)

  return (
    <section className="p-4 sm:p-6 lg:p-8" data-testid="play-page">
      <div
        className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_0.6fr]"
        data-testid="play-header-grid"
      >
        <div
          className="border border-black/10 bg-[#F5F5F5] p-6"
          data-testid="play-intro-card"
        >
          <p
            className="text-xs font-bold uppercase tracking-[0.2em] text-[#52525B]"
            data-testid="play-intro-overline"
          >
            Outcome markets
          </p>
          <h2
            className="mt-3 font-heading text-4xl font-black tracking-tight"
            data-testid="play-intro-title"
          >
            Bet, predict, pool, resolve, and claim winnings.
          </h2>
          <p
            className="mt-4 max-w-3xl text-sm leading-6 text-[#52525B]"
            data-testid="play-intro-copy"
          >
            Every wager, prediction market, and lucky pool action is represented as a simulated transaction flow ready for contract integration.
          </p>
        </div>
        <div
          className="border border-black/10 bg-black p-6 text-white"
          data-testid="play-live-oracle-card"
        >
          <Trophy className="h-7 w-7 text-[#FFB800]" />
          <p
            className="mt-5 text-xs font-bold uppercase tracking-[0.2em] text-white/60"
            data-testid="play-oracle-label"
          >
            Slinky pairs
          </p>
          <div className="mt-4 space-y-2" data-testid="play-oracle-list">
            {oraclePrices.slice(0, 3).map((price) => (
              <div
                key={price.id}
                className="flex items-center justify-between font-mono text-sm"
                data-testid={`play-oracle-${price.id}`}
              >
                <span data-testid={`play-oracle-pair-${price.id}`}>{price.pair}</span>
                <span className="text-[#00C566]" data-testid={`play-oracle-move-${price.id}`}>
                  {price.move}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Tabs defaultValue="wagers" className="mt-8" data-testid="play-tabs">
        <TabsList
          className="flex h-auto w-full flex-wrap justify-start rounded-none border border-black/10 bg-white p-0"
          data-testid="play-tabs-list"
        >
          {playTabs.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="rounded-none border-r border-black/10 px-4 py-3 data-[state=active]:bg-[#0022FF] data-[state=active]:text-white"
              data-testid={`play-tab-${tab.id}`}
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {playTabs.map((tab) => (
          <TabsContent
            key={tab.id}
            value={tab.id}
            className="mt-4"
            data-testid={`play-tab-content-${tab.id}`}
          >
            <div
              className="mb-4 border border-black/10 bg-white p-5"
              data-testid={`play-tab-summary-${tab.id}`}
            >
              <p
                className="text-xs font-bold uppercase tracking-[0.2em] text-[#52525B]"
                data-testid={`play-tab-label-${tab.id}`}
              >
                {tab.label}
              </p>
              <h2
                className="mt-2 font-heading text-3xl font-black tracking-tight"
                data-testid={`play-tab-title-${tab.id}`}
              >
                {tab.summary}
              </h2>
            </div>
            <div
              className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
              data-testid={`play-actions-grid-${tab.id}`}
            >
              {tab.actions.map((action) => (
                <ActionCard
                  key={action.id}
                  scope={`play-${tab.id}`}
                  action={action as Action}
                  onOpen={setModalAction}
                />
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
      {recentAction && (
        <div
          className="mt-6 border border-[#0022FF] p-4 font-mono text-sm text-[#0022FF]"
          data-testid="play-recent-action"
        >
          {recentAction.title} simulated at {recentAction.time}
        </div>
      )}
      <ActionDialog
        action={modalAction}
        onClose={() => setModalAction(null)}
        onComplete={setRecentAction}
      />
    </section>
  )
}
