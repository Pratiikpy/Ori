'use client'

/**
 * ActionCard — repeating tile on Money / Play / Profile surfaces.
 * Click "Open flow" → opens ActionDialog modal with form fields.
 *
 *   ┌───────────────────────────────────┐
 *   │ payment_router.move               │ ← mono contract eyebrow
 *   │ Send payment                      │ ← heavy display title
 *   │ Recipient · Amount · Memo         │ ← fields preview
 *   │ ┌───────────────────────────────┐ │
 *   │ │       Open flow               │ │ ← black solid pill
 *   │ └───────────────────────────────┘ │
 *   └───────────────────────────────────┘
 *
 * Hover: blue offset shadow + slight lift (signature prototype move).
 */
import * as React from 'react'

export interface ActionDef {
  id: string
  title: string
  contract: string
  fields: string[]
}

export function ActionCard({
  scope,
  action,
  onOpen,
}: {
  scope: string
  action: ActionDef
  onOpen: (action: ActionDef) => void
}) {
  return (
    <article
      className="group border border-black/10 bg-white p-5 transition-transform duration-200 hover:-translate-y-1 hover:border-[#0022FF] shadow-[0_0_0_0_rgba(0,34,255,0)] hover:shadow-[4px_4px_0px_0px_rgba(0,34,255,1)]"
    >
      <p className="font-mono text-xs text-[#52525B]">{action.contract}</p>
      <h3 className="mt-3 font-display text-xl font-bold tracking-tight">
        {action.title}
      </h3>
      <p className="mt-3 text-sm text-[#52525B]">
        {(action.fields || []).slice(0, 3).join(' · ')}
      </p>
      <button
        type="button"
        onClick={() => onOpen(action)}
        className="mt-5 w-full bg-[#0A0A0A] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#0022FF] cursor-pointer"
        data-testid={`action-open-${scope}-${action.id}`}
      >
        Open flow
      </button>
    </article>
  )
}
