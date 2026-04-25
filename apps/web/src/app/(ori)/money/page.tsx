'use client'

/**
 * Money page — verbatim port of ui-ref-orii/frontend/src/pages/Money.jsx.
 *
 * Real wiring (TODO):
 *   currentUser.balance → useInterwovenKit() balance fetch.
 *   portfolio → aggregation across balances + streams + paywalls.
 *   tab actions → msg* helpers in lib/contracts (already present).
 */
import { useState } from 'react'
import { ArrowUpRight, Gift, Radio, WalletCards } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { ActionCard, ActionDialog, type Action, type ActionRecord } from '@/components/action-dialog'
import { currentUser, media, moneyTabs, portfolio } from '@/data/ori-data'

export default function MoneyPage() {
  const [modalAction, setModalAction] = useState<Action | null>(null)
  const [recentAction, setRecentAction] = useState<ActionRecord | null>(null)

  return (
    <section className="p-4 sm:p-6 lg:p-8" data-testid="money-page">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4" data-testid="money-overview-grid">
        <div
          className="border border-black/10 bg-black p-6 text-white lg:col-span-2"
          data-testid="money-balance-card"
        >
          <p
            className="text-xs font-bold uppercase tracking-[0.2em] text-white/60"
            data-testid="money-balance-label"
          >
            Total wallet
          </p>
          <h2
            className="mt-4 font-mono text-4xl font-black tracking-tight"
            data-testid="money-balance-value"
          >
            {currentUser.balance}
          </h2>
          <p
            className="mt-4 max-w-xl text-sm leading-6 text-white/70"
            data-testid="money-balance-detail"
          >
            Prototype portfolio rolls up balances, paywalls, streams, tips, subscriptions, gifts, and sponsored gas readiness.
          </p>
        </div>
        <div className="border border-black/10 bg-white p-6" data-testid="money-agent-budget-card">
          <Radio className="h-6 w-6 text-[#0022FF]" />
          <p
            className="mt-5 text-xs font-bold uppercase tracking-[0.2em] text-[#52525B]"
            data-testid="money-agent-budget-label"
          >
            Agent daily cap
          </p>
          <p className="mt-2 font-mono text-2xl font-black" data-testid="money-agent-budget-value">
            250 INIT
          </p>
          <Progress
            value={38}
            className="mt-5 h-2 rounded-none bg-black/10"
            data-testid="money-agent-budget-progress"
          />
        </div>
        <div
          className="overflow-hidden border border-black/10 bg-[#F5F5F5]"
          data-testid="money-gift-visual-card"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={media.gift}
            alt="Gift box abstract visual"
            className="h-full min-h-48 w-full object-cover"
            data-testid="money-gift-visual-image"
          />
        </div>
      </div>

      <div
        className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4"
        data-testid="portfolio-grid"
      >
        {portfolio.map((item) => (
          <article
            key={item.id}
            className="border border-black/10 bg-white p-5"
            data-testid={`portfolio-item-${item.id}`}
          >
            <div className="flex items-center justify-between gap-3">
              <p
                className="font-heading text-xl font-bold"
                data-testid={`portfolio-asset-${item.id}`}
              >
                {item.asset}
              </p>
              <span
                className="flex items-center gap-1 font-mono text-xs text-[#0022FF]"
                data-testid={`portfolio-change-${item.id}`}
              >
                {item.change}
                <ArrowUpRight className="h-3 w-3" />
              </span>
            </div>
            <p className="mt-4 font-mono text-2xl font-black" data-testid={`portfolio-value-${item.id}`}>
              {item.value}
            </p>
            <p className="mt-1 font-mono text-xs text-[#52525B]" data-testid={`portfolio-amount-${item.id}`}>
              {item.amount}
            </p>
          </article>
        ))}
      </div>

      <Tabs defaultValue="payments" className="mt-8" data-testid="money-tabs">
        <TabsList
          className="flex h-auto w-full flex-wrap justify-start rounded-none border border-black/10 bg-white p-0"
          data-testid="money-tabs-list"
        >
          {moneyTabs.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="rounded-none border-r border-black/10 px-4 py-3 data-[state=active]:bg-[#0022FF] data-[state=active]:text-white"
              data-testid={`money-tab-${tab.id}`}
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {moneyTabs.map((tab) => (
          <TabsContent
            key={tab.id}
            value={tab.id}
            className="mt-4"
            data-testid={`money-tab-content-${tab.id}`}
          >
            <div
              className="mb-4 flex flex-col justify-between gap-3 border border-black/10 bg-[#F5F5F5] p-5 sm:flex-row sm:items-center"
              data-testid={`money-tab-summary-${tab.id}`}
            >
              <div>
                <p
                  className="text-xs font-bold uppercase tracking-[0.2em] text-[#52525B]"
                  data-testid={`money-tab-overline-${tab.id}`}
                >
                  {tab.label}
                </p>
                <h2
                  className="font-heading text-3xl font-black tracking-tight"
                  data-testid={`money-tab-title-${tab.id}`}
                >
                  {tab.summary}
                </h2>
              </div>
              <div
                className="flex items-center gap-2 font-mono text-sm text-[#0022FF]"
                data-testid={`money-tab-count-${tab.id}`}
              >
                {tab.actions.length} flows <WalletCards className="h-4 w-4" />
              </div>
            </div>
            <div
              className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
              data-testid={`money-actions-grid-${tab.id}`}
            >
              {tab.actions.map((action) => (
                <ActionCard
                  key={action.id}
                  scope={`money-${tab.id}`}
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
          className="fixed bottom-24 right-4 z-30 border border-[#0022FF] bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,34,255,1)]"
          data-testid="money-recent-action"
        >
          <Gift className="mr-2 inline h-4 w-4 text-[#0022FF]" />
          {recentAction.title} queued at {recentAction.time}
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
