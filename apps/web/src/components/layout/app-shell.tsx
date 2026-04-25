'use client'

/**
 * AppShell — Emergent OriShell port.
 *
 *   ┌────────┬─────────────────────────────────────────────────────┐
 *   │        │ EYEBROW                ┌───────────────────────────┐│
 *   │ Sidebar│ Surface title          │ Trust 92 │ 250 INIT/day  ││
 *   │ (w-72) ├─────────────────────────────────────────────────────┤
 *   │        │ <main> children </main>                            │
 *   │        │                                                     │
 *   │        ├─────────────────────────────────────────────────────┤
 *   │        │  [bottom nav on mobile only]                        │
 *   └────────┴─────────────────────────────────────────────────────┘
 */
import * as React from 'react'
import { Sidebar } from './sidebar'
import { MobileBottomNav } from './mobile-bottom-nav'
import { TopBadges } from './top-badges'

export function AppShell({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string
  title?: string
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-white text-[#0A0A0A]">
      <Sidebar />

      <header className="sticky top-0 z-30 border-b border-black/10 bg-white/95 px-4 py-4 backdrop-blur lg:ml-72 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            {eyebrow && (
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#52525B]">
                {eyebrow}
              </p>
            )}
            {title && (
              <h1 className="font-display text-2xl font-black tracking-tight sm:text-3xl">
                {title}
              </h1>
            )}
          </div>
          <div className="hidden items-center gap-3 sm:flex">
            <TopBadges />
          </div>
        </div>
      </header>

      <main id="main-content" className="pb-44 lg:ml-72 lg:pb-24">
        {children}
      </main>

      <MobileBottomNav />
    </div>
  )
}
