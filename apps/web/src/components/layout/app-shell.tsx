'use client'

/**
 * AppShell — Emergent layout.
 *
 *   ┌────────┬────────────────────────────────────────────────────┐
 *   │        │  EYEBROW                          ┌─────────────┐  │
 *   │ Sidebar│  Surface title (h1)               │ Trust 92    │  │
 *   │        │                                   │ 250 INIT/day│  │
 *   │        ├───────────────────────────────────┴─────────────┤  │
 *   │        │  page children                                  │  │
 *   │        │                                                 │  │
 *   └────────┴─────────────────────────────────────────────────┘
 *
 * Sidebar fixed w-64 on lg+. Mobile uses MobileChrome drawer. Surface
 * header is sticky so badges stay visible during scroll.
 */
import * as React from 'react'
import { Sidebar } from './sidebar'
import { MobileChrome } from './mobile-chrome'
import { TopBadges } from './top-badges'

interface AppShellProps {
  /** Small uppercase mono label above the title. */
  eyebrow?: string
  /** Surface heading — bold display face. */
  title?: string
  children: React.ReactNode
}

export function AppShell({ eyebrow, title, children }: AppShellProps) {
  return (
    <div className="relative min-h-dvh bg-white">
      <Sidebar />
      <MobileChrome />

      <div className="lg:pl-64">
        {(title || eyebrow) && (
          <header className="hidden lg:flex sticky top-0 z-20 h-20 px-8 items-center justify-between bg-white border-b border-[var(--color-line)]">
            <div className="flex flex-col">
              {eyebrow && <span className="eyebrow leading-none">{eyebrow}</span>}
              {title && (
                <h1 className="mt-1 font-display font-bold text-[24px] leading-tight text-ink tracking-[-0.02em]">
                  {title}
                </h1>
              )}
            </div>
            <TopBadges />
          </header>
        )}

        <main
          id="main-content"
          className="px-5 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-10 max-w-[1280px]"
        >
          {children}
        </main>
      </div>
    </div>
  )
}
