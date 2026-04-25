'use client'

/**
 * LandingShell — wraps the public marketing page.
 *
 * Different chrome from AppShell: a full-width sticky topbar with the
 * brand + a single "Open the app" CTA, no sidebar. Same ambient bg so
 * the visual continuity carries from landing → signed-in app.
 */
import * as React from 'react'
import Link from 'next/link'
import { useInterwovenKit } from '@initia/interwovenkit-react'
import { Icon } from '@/components/ui/icon'

export function LandingShell({ children }: { children: React.ReactNode }) {
  const { initiaAddress } = useInterwovenKit()
  // After sign-in we send the user to /today; before, /onboard.
  const ctaHref = initiaAddress ? '/today' : '/onboard'

  return (
    <div className="relative min-h-dvh bg-ambient">
      <header className="sticky top-0 z-30 backdrop-blur-2xl bg-white/40 border-b border-black/5 safe-area-top">
        <div className="mx-auto w-full max-w-7xl px-5 sm:px-8 h-16 flex items-center justify-between gap-6">
          <Link
            href="/"
            className="flex items-center gap-2.5 group shrink-0"
            aria-label="Ori home"
          >
            <span className="w-8 h-8 rounded-2xl bg-[#1D1D1F] inline-flex items-center justify-center group-hover:scale-105 transition">
              <span className="w-2 h-2 rounded-full bg-white" />
            </span>
            <span className="text-[17px] font-display font-medium text-ink tracking-[-0.02em]">
              Ori
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-7 text-[14px] text-ink-2">
            <a
              href="#capabilities"
              className="hover:text-ink transition"
            >
              Capabilities
            </a>
            <a href="#agents" className="hover:text-ink transition">
              Agents
            </a>
            <a href="#flow" className="hover:text-ink transition">
              Flow
            </a>
          </nav>

          <Link
            href={ctaHref}
            className="rounded-full h-10 px-5 bg-[#1D1D1F] text-white text-[13.5px] font-medium inline-flex items-center gap-1.5 hover:bg-black active:scale-[0.97] transition"
          >
            Open the app
            <Icon name="arrow-right" size={14} />
          </Link>
        </div>
      </header>

      <main id="main-content" className="relative z-10">
        {children}
      </main>

      <footer className="relative z-10 border-t border-black/5 mt-24">
        <div className="mx-auto w-full max-w-7xl px-5 sm:px-8 py-12 grid sm:grid-cols-3 gap-8 items-end">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-xl bg-[#1D1D1F] inline-flex items-center justify-center">
                <span className="w-2 h-2 rounded-full bg-white" />
              </span>
              <span className="text-[15px] font-display font-medium text-ink">
                Ori
              </span>
            </div>
            <p className="mt-3 text-[13px] text-ink-3 max-w-xs leading-[1.55]">
              Chat wallet for friends, funds, and AI agents — built on Initia.
            </p>
          </div>
          <div className="sm:text-center">
            <span className="text-[12px] font-mono text-ink-4">
              Built on bridged INIT · No token launch
            </span>
          </div>
          <div className="sm:text-right">
            <span className="text-[12px] font-mono text-ink-4">
              © Ori — all quiet.
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}
