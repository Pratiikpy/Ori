import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowRight,
  ExternalLink,
  Heart,
  Lock,
  Repeat,
  Star,
} from 'lucide-react'

import { MarketingTopbar, MarketingFooter } from '@/components/marketing-chrome'
import {
  Avatar,
  Eyebrow,
  Reveal,
  Stat,
  StatRibbon,
  VerifiedBadge,
} from '@/components/ui'

export const metadata: Metadata = {
  title: 'Creators · Ori',
  description:
    'A profile, a tip jar, and a stage. Everything a creator needs to make money on Ori — without leaving the chat.',
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
    title: 'A tip jar that just works',
    blurb:
      'Set a default amount or accept any. 1% platform fee, no monthly minimums, no chargebacks. Tips appear live on stream-overlay sources.',
    href: '/discover',
  },
  {
    icon: Lock,
    title: 'Paywall any URL',
    blurb:
      'Wrap a link with a one-time price. Speaks x402 so AI agents can unlock it under your daily cap. No CMS, no plugins.',
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
    <main className="relative min-h-dvh backdrop-stars">
      <MarketingTopbar active="/creators" />
      <div className="relative z-10">
        <section className="shell pt-20 lg:pt-28 pb-14">
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
            A profile, a tip jar, and{' '}
            <span className="font-serif">a stage</span>.
          </h1>
          <p
            className="mt-8 leading-[1.55] text-ink-2 max-w-[60ch]"
            style={{ fontSize: 'clamp(15px, 1.2vw, 17px)' }}
          >
            Linktree, Patreon, and Stripe in one page that lives on the
            chain. Your fans tip you in 100 ms. AI agents pay your paywall
            without a checkout. Everything you earn shows up in your
            wallet, instantly, never held by us.
          </p>
        </section>

        {/* Demo profile — full editorial layout */}
        <section className="shell pb-20">
          <Reveal>
            <div className="max-w-[560px] mx-auto rounded-3xl border border-[var(--color-border-strong)] bg-white/[0.022] overflow-hidden">
              <div className="h-[120px] bg-[linear-gradient(180deg,rgba(108,123,255,0.32)_0%,transparent_100%)]" />
              <div className="px-6 pb-8 -mt-[52px] flex flex-col items-center text-center">
                <Avatar name="mira" size="xl" hero />
                <div className="mt-4 flex items-center gap-2">
                  <span
                    className="font-serif text-[34px] leading-none text-foreground"
                    style={{ letterSpacing: '-0.01em' }}
                  >
                    mira.init
                  </span>
                  <VerifiedBadge size={22} />
                </div>
                <div className="mt-2 text-[13px] text-ink-2">videographer · lisbon</div>
                <div className="mt-1 text-[11.5px] font-mono text-ink-3">
                  mira.init · 0xc29d…8a4f
                </div>
                <p className="mt-5 text-[14px] text-ink-2 leading-[1.6] max-w-[44ch]">
                  Short films, travel cuts, and the occasional slow-motion
                  rain. Tips go straight to better gear and coffee for the team.
                </p>

                <div className="w-full mt-8">
                  <StatRibbon>
                    <Stat value="$4,280" label="Tipped" />
                    <Stat value="128" label="Subs" />
                    <Stat value="2.1k" label="Followers" />
                  </StatRibbon>
                </div>

                <div className="w-full mt-6 grid grid-cols-2 gap-2.5">
                  <DemoLink
                    icon={<Heart className="w-4 h-4" />}
                    label="Tip $5"
                    accent
                  />
                  <DemoLink
                    icon={<Repeat className="w-4 h-4" />}
                    label="Subscribe · monthly"
                  />
                  <DemoLink
                    icon={<Lock className="w-4 h-4" />}
                    label="Unlock · behind-the-cut ($3)"
                  />
                  <DemoLink
                    icon={<ExternalLink className="w-4 h-4" />}
                    label="Latest film"
                  />
                </div>

                <div className="w-full mt-8 pt-6 border-t border-[var(--color-border)] text-left">
                  <Eyebrow>Recent activity</Eyebrow>
                  <ul className="mt-3 space-y-2.5">
                    <ActivityItem who="alex.init" what="tipped" amt="$5" t="2m" />
                    <ActivityItem who="sam.init" what="unlocked paywall" amt="$3" t="14m" />
                    <ActivityItem who="jamie.init" what="subscribed" amt="$9" t="1h" />
                    <ActivityItem who="lina.init" what="tipped" amt="$20" t="yday" />
                    <ActivityItem who="agent.claude" what="paid paywall" amt="$1" t="yday" />
                  </ul>
                </div>
              </div>
            </div>
          </Reveal>
        </section>

        {/* Feature blurbs */}
        <section className="shell pb-24">
          <div className="grid sm:grid-cols-2 gap-4 lg:gap-5">
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={i * 60}>
                <Link
                  href={f.href}
                  className="block rounded-2xl border border-[var(--color-border-strong)] bg-white/[0.022] p-7 panel-hover"
                >
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-xl bg-white/[0.04] border border-[var(--color-border)] inline-flex items-center justify-center shrink-0">
                      <f.icon className="w-5 h-5 text-primary-bright" />
                    </div>
                    <div>
                      <h3 className="text-[18px] font-medium text-foreground tracking-tight">
                        {f.title}
                      </h3>
                      <p className="mt-2 text-[13.5px] text-ink-2 leading-[1.55]">
                        {f.blurb}
                      </p>
                    </div>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </section>

        <section className="shell pb-12">
          <div className="rounded-3xl border border-primary/30 bg-primary/[0.05] p-8 lg:p-12 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
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
                <span className="font-serif">Two minutes.</span> No editor, no plugins.
              </h2>
            </div>
            <Link
              href="/onboard"
              className="shrink-0 inline-flex items-center gap-2 rounded-full h-12 px-6 text-[14px] font-medium bg-primary text-primary-foreground hover:bg-accent-2 hover:-translate-y-px transition"
            >
              Claim your name <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      </div>
      <MarketingFooter />
    </main>
  )
}

function DemoLink({
  icon,
  label,
  accent,
}: {
  icon: React.ReactNode
  label: string
  accent?: boolean
}) {
  return (
    <span
      className={
        'rounded-xl border px-4 py-3 text-[13px] flex items-center justify-center gap-2 ' +
        (accent
          ? 'border-primary/35 bg-primary/[0.08] text-primary-bright'
          : 'border-[var(--color-border)] bg-white/[0.025] text-ink-2')
      }
    >
      {icon}
      {label}
    </span>
  )
}

function ActivityItem({
  who,
  what,
  amt,
  t,
}: {
  who: string
  what: string
  amt: string
  t: string
}) {
  return (
    <li className="flex items-center gap-3">
      <Avatar name={who} size="sm" />
      <span className="flex-1 text-[13px] text-ink-2">
        <span className="text-foreground font-medium">{who}</span>{' '}
        <span className="text-ink-3">{what}</span>
      </span>
      <span className="font-mono tabular-nums text-[12.5px] text-foreground">{amt}</span>
      <span className="font-mono text-[10.5px] text-ink-4 w-8 text-right">{t}</span>
    </li>
  )
}
