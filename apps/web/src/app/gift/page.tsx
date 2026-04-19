'use client'

import Link from 'next/link'
import { Gift, Link as LinkIcon, ArrowRight } from 'lucide-react'
import { AppShell } from '@/components/app-shell'

export default function GiftIndexPage() {
  return (
    <AppShell title="Gift">
      <div className="max-w-md mx-auto w-full px-5 py-5 space-y-3">
        <h1 className="text-2xl font-bold">Send a gift</h1>
        <p className="text-sm text-muted-foreground">
          Wrap a payment in a theme. Directed gifts go to a specific{' '}
          <span className="font-mono">.init</span>. Shareable links work for anyone — even people
          who don&rsquo;t have Ori yet.
        </p>

        <Link
          href="/gift/new"
          className="flex items-center justify-between rounded-2xl border border-border bg-muted/40 px-4 py-4 hover:bg-muted transition"
        >
          <div className="flex items-start gap-3">
            <Gift className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <div className="font-medium">Directed gift</div>
              <div className="text-xs text-muted-foreground">Send to a specific .init name</div>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground" />
        </Link>

        <Link
          href="/gift/new?mode=link"
          className="flex items-center justify-between rounded-2xl border border-border bg-muted/40 px-4 py-4 hover:bg-muted transition"
        >
          <div className="flex items-start gap-3">
            <LinkIcon className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <div className="font-medium">Shareable link</div>
              <div className="text-xs text-muted-foreground">
                Claim-by-URL — invites people onto Ori
              </div>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground" />
        </Link>
      </div>
    </AppShell>
  )
}
