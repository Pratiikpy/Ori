import Link from 'next/link'
import { LandingShell } from '@/components/layout/landing-shell'
import { GlassCard, Icon } from '@/components/ui'

export default function NotFound() {
  return (
    <LandingShell>
      <section className="mx-auto w-full max-w-md px-5 py-20 text-center">
        <GlassCard padding="lg">
          <div className="mx-auto w-14 h-14 rounded-full bg-white/80 border border-black/5 inline-flex items-center justify-center mb-5">
            <Icon name="info" size={24} className="text-ink-3" />
          </div>
          <h1 className="text-[32px] font-display font-medium text-ink leading-tight tracking-[-0.02em]">
            Off the grid.
          </h1>
          <p className="mt-3 text-[14px] text-ink-2 leading-[1.55]">
            That URL doesn't point at anything on Ori. Maybe the link is old,
            or the <span className="font-mono">.init</span> name hasn't been
            registered yet.
          </p>
          <div className="mt-6 flex flex-col gap-2.5">
            <Link
              href="/today"
              className="rounded-full h-12 px-6 bg-[#1D1D1F] text-white text-[14px] font-medium inline-flex items-center justify-center hover:bg-black active:scale-[0.97] transition"
            >
              Back to Today
            </Link>
            <Link
              href="/"
              className="rounded-full h-12 px-6 bg-black/5 text-ink text-[14px] font-medium inline-flex items-center justify-center hover:bg-black/10 active:scale-[0.97] transition"
            >
              Go to landing
            </Link>
          </div>
        </GlassCard>
      </section>
    </LandingShell>
  )
}
