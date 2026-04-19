'use client'

/**
 * Interactive shell for the landing page.
 *
 * Why split this out: the landing content is mostly static (hero copy,
 * capability tiles, code blocks, footer) and benefits from being server-
 * rendered so markers land in the initial HTML for crawlers and first paint.
 * Only these bits truly need client JS:
 *
 *   1. Scroll-reveal animation — IntersectionObserver adds `.in` to .reveal
 *      elements once as they enter the viewport.
 *   2. Wallet connect pill — reads useInterwovenKit() and routes to /today
 *      or triggers openConnect().
 *   3. Device parallax — pointer-move 3D tilt on the hero device mock.
 *   4. LiveDeviceChat — the hero's beating heart. A scripted 4-beat chat that
 *      plays our headline ("messages that move money") as kinetic, not static.
 *      No peer in the reference-projects folder has this.
 *
 * So the page.tsx stays a server component and imports this client shell to
 * wrap the layout, plus `<HeaderConnectPill />` for the nav-right button.
 */

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useInterwovenKit } from '@initia/interwovenkit-react'

export function ScrollReveal({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window === 'undefined') return
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('in')
            io.unobserve(e.target)
          }
        }
      },
      { rootMargin: '0px 0px -80px 0px', threshold: 0.05 },
    )
    document.querySelectorAll('.reveal').forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])
  return <>{children}</>
}

/**
 * Header CTA — reference nav-cta style: outlined pill with border-strong,
 * arrow that translates on hover, no filled accent. Keeps the header quiet
 * per "The restraint is the product." philosophy — accent indigo lives on
 * message bubbles + data surfaces, not chrome.
 */
export function HeaderConnectPill() {
  const { initiaAddress, username, openConnect } = useInterwovenKit()

  const baseClass =
    'group inline-flex items-center gap-2 rounded-full px-3.5 h-8 text-[13px] text-foreground border border-[var(--color-border-strong)] hover:bg-white/[0.04] hover:border-[var(--color-border-emphasis)] transition-[background,border-color,color] duration-200'

  if (initiaAddress) {
    const displayName = username ?? `${initiaAddress.slice(0, 8)}…${initiaAddress.slice(-4)}`
    return (
      <Link href="/today" className={baseClass}>
        <span className="font-mono tracking-tight text-[12px]">{displayName}</span>
        <svg
          viewBox="0 0 16 16"
          className="h-3 w-3 transition-transform group-hover:translate-x-0.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden
        >
          <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Link>
    )
  }
  return (
    <button onClick={() => void openConnect()} className={baseClass}>
      Launch
      <svg
        viewBox="0 0 16 16"
        className="h-3 w-3 transition-transform group-hover:translate-x-0.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        aria-hidden
      >
        <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  )
}

/**
 * <DeviceParallax> — pointer-move 3D tilt for the hero device mock.
 *
 * Wraps the server-rendered device SVG/markup and adds a subtle rotateY/X
 * based on cursor position. Disabled on touch devices (no hover media query)
 * and on `prefers-reduced-motion`. Same interaction as the original Ori.html
 * landing had — this component re-introduces it post server-component split.
 */
export function DeviceParallax({ children }: { children: React.ReactNode }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const wrap = wrapRef.current
    const inner = innerRef.current
    if (!wrap || !inner) return
    // Honor a11y preferences + skip on touch-first devices.
    if (!window.matchMedia('(hover: hover)').matches) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const onMove = (e: MouseEvent) => {
      const r = wrap.getBoundingClientRect()
      const x = (e.clientX - r.left) / r.width - 0.5
      const y = (e.clientY - r.top) / r.height - 0.5
      inner.style.transform = `perspective(1200px) rotateY(${x * 6}deg) rotateX(${-y * 4}deg)`
      inner.style.transition = 'transform 120ms cubic-bezier(0.2,0.7,0.2,1)'
    }
    const onLeave = () => {
      inner.style.transform = ''
      inner.style.transition = 'transform 600ms cubic-bezier(0.2,0.7,0.2,1)'
    }
    wrap.addEventListener('mousemove', onMove)
    wrap.addEventListener('mouseleave', onLeave)
    return () => {
      wrap.removeEventListener('mousemove', onMove)
      wrap.removeEventListener('mouseleave', onLeave)
    }
  }, [])

  return (
    <div ref={wrapRef} className="flex justify-center md:justify-end">
      <div ref={innerRef} style={{ willChange: 'transform' }}>
        {children}
      </div>
    </div>
  )
}

/**
 * Primary hero CTA — reference's signature move: white ink on dark canvas,
 * pill-shape, tiny translate-Y on hover. NOT indigo. The reference uses
 * indigo (accent) only for data surfaces and outgoing message bubbles;
 * the hero CTA is the brand's "Linear-calibrated minimal" signal.
 */
export function HeroPrimaryCta() {
  const { initiaAddress } = useInterwovenKit()
  const href = initiaAddress ? '/today' : '/onboard'
  return (
    <Link
      href={href}
      className="group inline-flex items-center gap-2 rounded-full h-[46px] px-5 text-[14px] font-medium bg-foreground text-background hover:-translate-y-[1px] transition will-change-transform"
      style={{ letterSpacing: '-0.005em' }}
    >
      Open the app
      <svg
        viewBox="0 0 16 16"
        className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        aria-hidden
      >
        <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </Link>
  )
}

/* ──────────────────────────────────────────────────────────────────────────
   LIVE DEVICE CHAT — hero's beating heart.

   Four-beat scripted performance of the product pitch:
     0.4s  incoming: "dinner at nobu, 64.80 split 4 ways?"
     1.3s  outgoing: "sending now"
     2.1s  PayCard slides in, tick animates to checkmark (the peak moment)
     2.8s  incoming: "ty"
     6.3s  everything clears, loop restarts

   Script delays are tuned so a reader can take in each message without the
   chat feeling slow. The loop gap (3.5s) gives the eye a rest before the
   demo replays — a lot of landings cycle demos too fast to be legible.

   Reduced-motion users get all four messages at once and no animation.
   That's the right behavior — the message still communicates even without
   the kinetic performance.
   ────────────────────────────────────────────────────────────────────────── */

type ChatBeat =
  | { t: 'in'; text: string }
  | { t: 'out'; text: string }
  | { t: 'pay'; amt: string; meta: string }

const HERO_SCRIPT: readonly ChatBeat[] = [
  { t: 'in', text: 'dinner at nobu, 64.80 split 4 ways?' },
  { t: 'out', text: 'sending now' },
  { t: 'pay', amt: '16.20', meta: 'Landed · 97ms · 0x4a…b3c2' },
  { t: 'in', text: 'ty' },
]

const STEP_DELAYS = [420, 900, 820, 720] as const // ms between beats
const LOOP_PAUSE = 3500 // ms before restart

export function LiveDeviceChat() {
  const [gen, setGen] = useState(0)
  const [step, setStep] = useState(0)
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    // Reduced-motion short-circuit: show the whole conversation instantly
    // and stop. No loop, no kinetics. The story still reads.
    if (reducedMotion) {
      setStep(HERO_SCRIPT.length)
      return
    }
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const queue = (delay: number, fn: () => void) => {
      timer = setTimeout(() => {
        if (cancelled) return
        fn()
      }, delay)
    }
    const play = (idx: number) => {
      if (cancelled) return
      if (idx < HERO_SCRIPT.length) {
        queue(STEP_DELAYS[idx] ?? 700, () => {
          setStep(idx + 1)
          play(idx + 1)
        })
      } else {
        queue(LOOP_PAUSE, () => {
          // Start the next generation: AnimatePresence sees all old keys
          // vanish and exits them; new keys mount fresh with entry animation.
          setGen((g) => g + 1)
          setStep(0)
          play(0)
        })
      }
    }
    play(0)
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [reducedMotion])

  return (
    <div className="px-4 py-4 min-h-[280px] flex flex-col justify-end gap-2 overflow-hidden">
      <AnimatePresence initial={false}>
        {HERO_SCRIPT.slice(0, step).map((beat, i) => (
          <motion.div
            key={`${gen}-${i}`}
            initial={reducedMotion ? false : { opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, transition: { duration: 0.2 } }}
            transition={{ type: 'spring', stiffness: 320, damping: 26, mass: 0.9 }}
          >
            {beat.t === 'in' ? (
              <LiveMsgIn>{beat.text}</LiveMsgIn>
            ) : beat.t === 'out' ? (
              <LiveMsgOut>{beat.text}</LiveMsgOut>
            ) : (
              <LivePayCard amt={beat.amt} meta={beat.meta} />
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

function LiveMsgIn({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-[82%] text-[12.5px] leading-[1.4] rounded-2xl rounded-bl-sm bg-white/[0.05] border border-border text-foreground px-3 py-1.5">
      {children}
    </div>
  )
}

function LiveMsgOut({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-[82%] ml-auto text-[12.5px] leading-[1.4] rounded-2xl rounded-br-sm bg-[var(--color-primary)] text-white px-3 py-1.5">
      {children}
    </div>
  )
}

/**
 * Payment card with an animated tick — the peak moment. Card springs in,
 * then 180ms later the check-badge scales from 0.2 → 1 and the stroke
 * draws. That sequence is what "settlement in a hundred milliseconds"
 * looks like if you could see it.
 */
function LivePayCard({ amt, meta }: { amt: string; meta: string }) {
  const reducedMotion = useReducedMotion()
  return (
    <div className="ml-auto max-w-[86%] rounded-2xl border border-border bg-[var(--color-surface-1)] p-3">
      <div className="text-[10.5px] uppercase tracking-[0.14em] text-ink-3">Sent · mira.init</div>
      <div className="tnum text-[22px] font-medium mt-1">
        <span className="text-ink-3 text-[14px] mr-0.5 align-[0.12em]">$</span>
        {amt}
      </div>
      <div className="mt-2 flex items-center gap-1.5 text-[10.5px] text-ink-3 font-mono">
        <motion.span
          className="inline-flex h-3.5 w-3.5 rounded-full bg-[var(--color-success)] items-center justify-center"
          initial={reducedMotion ? false : { scale: 0.2, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.18, type: 'spring', stiffness: 420, damping: 22 }}
        >
          <motion.svg
            viewBox="0 0 16 16"
            width="9"
            height="9"
            fill="none"
            stroke="#07070a"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <motion.path
              d="M4 8l2.5 2.5L12 5"
              initial={reducedMotion ? false : { pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: 0.32, duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            />
          </motion.svg>
        </motion.span>
        <span>{meta}</span>
      </div>
    </div>
  )
}
