import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Heart, Lock, Repeat, Star } from 'lucide-react'

import { MarketingTopbar, MarketingFooter } from '@/components/marketing-chrome'
import { CreatorProfile } from '@/components/landing/CreatorProfile'
import { Card, Eyebrow, Reveal, Serif } from '@/components/ui'

export const metadata: Metadata = {
  title: 'Creators · Ori',
  description:
    'Linktree, Patreon, and Stripe in one page that lives on the chain. Tips in 100ms, agent-payable paywalls, escrowed subscriptions.',
}

interface FeatureBlurb {
  icon: typeof Star
  title: string
  blurb: string
  href: string
}

const FEATURES: FeatureBlurb[] = [
  {
    icon: Star,
    title: 'Tip jar that just works',
    blurb:
      'Set a default amount or accept any. 1% platform fee, no monthly minimums, no chargebacks. Tips appear live on stream-overlay sources.',
    href: '/discover',
  },
  {
    icon: Lock,
    title: 'Paywall any URL',
    blurb:
      'Wrap a link with a one-time price. Speaks x402 so AI agents can unlock it under your daily cap.',
    href: '/paywall/new',
  },
  {
    icon: Repeat,
    title: 'Subscriptions, escrowed',
    blurb:
      'Funds stay in the contract until you release each period. Subscribers cancel anytime; nothing leaves the vault before service is rendered.',
    href: '/subscriptions',
  },
  {
    icon: Heart,
    title: 'Loyalty as on-chain reputation',
    blurb:
      'Followers, badges, attestations — a portable creator identity that lives on the chain, not on a platform that can yank you.',
    href: '/discover',
  },
]

export default function CreatorsPage() {
  return (
    <main id="main-content" className="relative min-h-dvh backdrop-stars">
      <MarketingTopbar active="/creators" />
      <div className="relative z-10">
        {/* Hero */}
        <section className="shell pt-[clamp(48px,10vw,140px)] pb-[clamp(48px,8vw,100px)]">
          <Reveal>
            <Eyebrow>· Creators</Eyebrow>
            <h1
              className="mt-5 leading-[0.98] text-foreground"
              style={{
                fontSize: 'clamp(36px, 6vw, 80px)',
                fontWeight: 400,
                letterSpacing: '-0.04em',
                maxWidth: '15ch',
              }}
            >
              A profile, a tip jar, <Serif>and a stage</Serif>.
            </h1>
            <p
              className="mt-8 leading-[1.55] text-ink-2 max-w-[60ch]"
              style={{ fontSize: 'clamp(15px, 1.2vw, 17px)' }}
            >
              Linktree, Patreon, and Stripe in one page that lives on the
              chain. Your fans tip you in 100ms. AI agents pay your paywall
              without a checkout. Everything you earn shows up in your wallet,
              instantly, never held by us.
            </p>
          </Reveal>
        </section>

        {/* Linktree mira.init demo */}
        <CreatorProfile />

        {/* 4 explainer cards */}
        <section className="shell pt-[clamp(72px,12vw,140px)] pb-[clamp(72px,12vw,140px)]">
          <div className="grid sm:grid-cols-2 lg:grid-cols-2 gap-4">
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={i * 60}>
                <Link href={f.href} className="block h-full">
                  <Card interactive className="p-7 h-full">
                    <div className="flex items-start gap-4">
                      <div className="h-10 w-10 rounded-xl bg-white/[0.04] border border-[var(--color-border)] inline-flex items-center justify-center shrink-0">
                        <f.icon className="w-5 h-5 text-primary-bright" />
                      </div>
                      <div className="flex-1">
                        <h3
                          className="text-foreground tracking-tight"
                          style={{
                            fontSize: 'clamp(17px,1.4vw,20px)',
                            fontWeight: 500,
                            letterSpacing: '-0.015em',
                          }}
                        >
                          {f.title}
                        </h3>
                        <p
                          className="mt-2 text-ink-2 leading-[1.6]"
                          style={{ fontSize: 'clamp(13.5px,1vw,14.5px)' }}
                        >
                          {f.blurb}
                        </p>
                        <div className="mt-4 inline-flex items-center gap-1 text-[12.5px] text-ink-3 font-mono uppercase tracking-[0.08em]">
                          Learn more
                          <ArrowRight className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </div>
                  </Card>
                </Link>
              </Reveal>
            ))}
          </div>
        </section>

        {/* CTA strip */}
        <section className="shell pb-[clamp(72px,12vw,140px)]">
          <Reveal>
            <div className="rounded-2xl border border-violet-500/30 bg-violet-500/[0.05] p-8 lg:p-12 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
              <div>
                <Eyebrow>Set up your profile</Eyebrow>
                <h2
                  className="mt-3 leading-[1.1] text-foreground"
                  style={{
                    fontSize: 'clamp(24px, 2.5vw, 36px)',
                    fontWeight: 400,
                    letterSpacing: '-0.02em',
                  }}
                >
                  <Serif>Two minutes.</Serif> No editor, no plugins.
                </h2>
              </div>
              <Link
                href="/onboard"
                className="shrink-0 inline-flex items-center gap-2 rounded-full h-12 px-6 text-[14px] font-medium bg-primary text-primary-foreground hover:bg-accent-2 hover:-translate-y-px transition"
              >
                Claim your name <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </Reveal>
        </section>
      </div>
      <MarketingFooter />
    </main>
  )
}
