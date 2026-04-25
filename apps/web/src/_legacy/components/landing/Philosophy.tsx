// Philosophy — 3-up principle grid: 01 Quiet by default / 02 Fast enough to
// feel native / 03 Built to hand off. Title uses ink-3 muted "The restraint".
// Ports Ori-landing.html lines 1609-1635 (#philosophy / .philos).

import type { ReactNode } from 'react'
import { Reveal, SectionHead, Serif } from '@/components/ui'

interface Principle {
  n: string
  h: ReactNode
  p: string
}

const PRINCIPLES: readonly Principle[] = [
  {
    n: '01',
    h: (
      <>
        <Serif>Quiet</Serif> by default.
      </>
    ),
    p: "Crypto apps shout numbers. Messengers ignore money. Ori does neither. Every chrome element waits until it's needed.",
  },
  {
    n: '02',
    h: (
      <>
        <Serif>Fast</Serif> enough to feel native.
      </>
    ),
    p: "100ms settlement is not a feature bullet — it's the only reason in-chat payments stop feeling bolted on. Without it, this UI would be a lie.",
  },
  {
    n: '03',
    h: (
      <>
        Built to <Serif>hand off</Serif>.
      </>
    ),
    p: 'Non-custodial. Open identity. Export your wallet any time. Agents speak a standard protocol. Nothing we do locks you in.',
  },
]

export function Philosophy() {
  return (
    <section className="shell pt-16 pb-24">
      <Reveal>
        <SectionHead
          eyebrow="04 · Philosophy"
          title={
            <>
              <span className="text-ink-3">The restraint</span> is the product.
            </>
          }
        />
      </Reveal>
      <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-10">
        {PRINCIPLES.map((p) => (
          <PrincipleCell key={p.n} {...p} />
        ))}
      </div>
    </section>
  )
}

function PrincipleCell({ n, h, p }: Principle) {
  return (
    <Reveal>
      <div className="font-mono text-[11px] text-ink-4">/ {n}</div>
      <div className="mt-4 text-[22px] md:text-[26px] font-medium leading-[1.15] tracked-tight text-foreground">
        {h}
      </div>
      <p className="mt-4 text-[14.5px] leading-[1.65] text-ink-2">{p}</p>
    </Reveal>
  )
}
