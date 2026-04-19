'use client'

import Link from 'next/link'
import { Gift, Link as LinkIcon, ArrowRight } from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import { PageHeader, Serif } from '@/components/page-header'

export default function GiftIndexPage() {
  return (
    <AppShell title="Gift">
      <div className="max-w-md mx-auto w-full px-5 pt-8 pb-8">
        <PageHeader
          kicker="04 · Gift"
          title={
            <>
              Wrap a payment in a <Serif>theme</Serif>.
            </>
          }
          sub="Directed gifts go to a specific .init. Shareable links work for anyone — even people who don't have Ori yet."
        />

        <div className="mt-8 grid gap-3">
          <Link
            href="/gift/new"
            className="flex items-center justify-between rounded-2xl border border-[var(--color-border-strong)] bg-white/[0.022] px-5 py-4 panel-hover group"
          >
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/15 text-[var(--color-primary-bright)] flex items-center justify-center shrink-0">
                <Gift className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-[0.14em] text-ink-3 font-mono">
                  Directed
                </div>
                <div className="mt-0.5 text-[15px] font-medium tracking-[-0.01em]">
                  To a specific <span className="font-mono">.init</span>
                </div>
                <div className="mt-0.5 text-[12px] text-ink-3">
                  Claim is instant for the recipient
                </div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-ink-3 group-hover:text-foreground group-hover:translate-x-0.5 transition" />
          </Link>

          <Link
            href="/gift/new?mode=link"
            className="flex items-center justify-between rounded-2xl border border-[var(--color-border-strong)] bg-white/[0.022] px-5 py-4 panel-hover group"
          >
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/15 text-[var(--color-primary-bright)] flex items-center justify-center shrink-0">
                <LinkIcon className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-[0.14em] text-ink-3 font-mono">
                  Shareable
                </div>
                <div className="mt-0.5 text-[15px] font-medium tracking-[-0.01em]">
                  Claim by <Serif>URL</Serif>
                </div>
                <div className="mt-0.5 text-[12px] text-ink-3">
                  Works for anyone — invites them onto Ori
                </div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-ink-3 group-hover:text-foreground group-hover:translate-x-0.5 transition" />
          </Link>
        </div>
      </div>
    </AppShell>
  )
}
