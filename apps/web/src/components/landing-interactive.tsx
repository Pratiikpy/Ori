'use client'

/**
 * Interactive shell for the landing page.
 *
 * Why split this out: the landing content is mostly static (hero copy,
 * capability tiles, code blocks, footer) and benefits from being server-
 * rendered so markers land in the initial HTML for crawlers and first paint.
 * Only two bits truly need client JS:
 *
 *   1. Scroll-reveal animation — IntersectionObserver adds `.in` to .reveal
 *      elements once as they enter the viewport.
 *   2. Wallet connect pill — reads useInterwovenKit() and routes to /today
 *      or triggers openConnect().
 *
 * So the page.tsx stays a server component and imports this client shell to
 * wrap the layout, plus `<HeaderConnectPill />` for the nav-right button.
 */

import Link from 'next/link'
import { useEffect, useRef } from 'react'
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

export function HeaderConnectPill() {
  const { initiaAddress, username, openConnect } = useInterwovenKit()

  if (initiaAddress) {
    const displayName = username ?? `${initiaAddress.slice(0, 8)}…${initiaAddress.slice(-4)}`
    return (
      <Link
        href="/today"
        className="inline-flex items-center gap-1.5 rounded-full h-8 px-3.5 text-[12.5px] font-medium bg-white/[0.04] border border-border hover:bg-white/[0.07] transition"
      >
        <span className="font-mono tracking-tight">{displayName}</span>
      </Link>
    )
  }
  return (
    <button
      onClick={() => void openConnect()}
      className="inline-flex items-center gap-1.5 rounded-full h-8 px-4 text-[12.5px] font-medium text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-bright)] transition"
    >
      Sign in
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

/** Primary hero CTA — resolves href + label off wallet state. */
export function HeroPrimaryCta() {
  const { initiaAddress } = useInterwovenKit()
  const href = initiaAddress ? '/today' : '/onboard'
  return (
    <Link
      href={href}
      className="group inline-flex items-center gap-1.5 rounded-full h-11 px-5 text-[14px] font-medium text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-bright)] transition"
    >
      Open Ori
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
