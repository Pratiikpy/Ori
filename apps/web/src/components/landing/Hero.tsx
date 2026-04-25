// Hero — headline, sub, CTAs, and the parallaxed device mock with LiveDeviceChat.
// Ports Ori-landing.html lines 1097-1156. DeviceMock extracted from app/page.tsx.

import { Reveal, Serif } from '@/components/ui'
import {
  DeviceParallax,
  HeroPrimaryCta,
  LiveDeviceChat,
} from '@/components/landing-interactive'
import { SendArrowIcon } from '@/components/icons'

export function Hero() {
  return (
    <section className="shell pt-[clamp(48px,10vw,140px)] pb-[clamp(56px,8vw,80px)]">
      <div className="grid lg:grid-cols-[1.05fr_1fr] gap-14 lg:gap-20 items-start">
        <Reveal>
          <HeroTag />
          <h1
            className="mt-10 leading-[0.98] text-foreground"
            style={{
              fontSize: 'clamp(42px, 7.2vw, 104px)',
              fontWeight: 400,
              letterSpacing: '-0.045em',
              maxWidth: '14ch',
            }}
          >
            Messages that <Serif>move</Serif> money.
          </h1>
          <p
            className="mt-8 leading-[1.55] text-ink-2"
            style={{
              fontSize: 'clamp(16px, 1.35vw, 19px)',
              maxWidth: '52ch',
            }}
          >
            Ori is a chat app where your friends, your funds, and your AI agents share
            one surface. One name everywhere. Settlement in a hundred milliseconds.
            Nothing to confirm.
          </p>
          <div className="mt-11 flex flex-wrap items-center gap-3">
            <HeroPrimaryCta />
            <a
              href="#capabilities"
              className="inline-flex items-center gap-1.5 rounded-full h-[46px] px-5 text-[14px] font-medium text-ink-2 border border-[var(--color-border-strong)] hover:border-[var(--color-border-emphasis)] hover:text-foreground hover:bg-white/[0.022] transition"
            >
              See it work
            </a>
          </div>
        </Reveal>

        <Reveal className="flex justify-center lg:justify-end mt-6 lg:mt-0">
          <DeviceParallax>
            <DeviceMock />
          </DeviceParallax>
        </Reveal>
      </div>
    </section>
  )
}

/**
 * HeroTag — the green pulse pill that says "Now on Initia · v0.1".
 * Source: Ori-landing.html lines 1100-1103.
 */
function HeroTag() {
  return (
    <div className="inline-flex items-center gap-2.5 rounded-full border border-[var(--color-border-strong)] bg-white/[0.022] px-3.5 h-[30px] text-[12px] text-ink-2">
      <span className="relative inline-flex">
        <span
          className="h-[6px] w-[6px] rounded-full bg-[var(--color-success)]"
          style={{
            boxShadow: '0 0 0 4px rgba(107, 208, 163, 0.15)',
            animation: 'ori-hero-pulse 2.4s ease-in-out infinite',
          }}
        />
      </span>
      <span className="font-mono text-ink-2">Now on Initia · v0.1</span>
    </div>
  )
}

/**
 * DeviceMock — iPhone-shaped frame, dynamic island, status bar, then the
 * <LiveDeviceChat /> animated thread, then a quiet composer pill at the foot.
 * Source: Ori-landing.html lines 1121-1154 (.device).
 */
function DeviceMock() {
  return (
    <div
      className="relative border border-[var(--color-border-strong)] mx-auto"
      style={{
        width: '100%',
        maxWidth: '380px',
        aspectRatio: '9 / 19.5',
        background: '#0d0d12',
        borderRadius: '44px',
        padding: '10px',
        boxShadow:
          '0 0 0 1px rgba(255,255,255,0.03) inset, 0 80px 120px -40px rgba(108, 123, 255, 0.25), 0 40px 80px -20px rgba(0,0,0,0.6)',
      }}
    >
      {/* Dynamic island notch */}
      <div
        aria-hidden
        className="absolute left-1/2 -translate-x-1/2 z-10"
        style={{
          top: '22px',
          width: '90px',
          height: '24px',
          background: '#000',
          borderRadius: '999px',
        }}
      />

      <div
        className="overflow-hidden flex flex-col h-full relative"
        style={{
          borderRadius: '36px',
          background: 'var(--color-bg-2)',
        }}
      >
        {/* Chat header — eats top padding so it sits below the notch. */}
        <div
          className="flex items-center gap-2.5 pt-[54px] px-[18px] pb-[14px] border-b border-[var(--color-line-hairline)]"
          style={{
            background: 'rgba(11, 11, 16, 0.9)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
          }}
        >
          <div
            className="h-8 w-8 rounded-full flex items-center justify-center text-[13px] font-medium text-black shrink-0"
            style={{ background: 'linear-gradient(135deg, #ff9ec7, #ff6b9d)' }}
          >
            M
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[14px] font-medium tracking-[-0.01em]">
              mira<span className="text-ink-3">.init</span>
            </div>
            <div className="text-[11px] font-mono text-ink-3">typing…</div>
          </div>
        </div>

        <LiveDeviceChat />

        {/* Composer bar */}
        <div className="flex gap-2 items-center px-3 pt-[10px] pb-[28px] border-t border-[var(--color-line-hairline)] mt-auto">
          <div
            className="flex-1 rounded-full text-[12px] text-ink-3 px-[14px] py-[10px] border"
            style={{
              background: 'rgba(255, 255, 255, 0.04)',
              borderColor: 'var(--color-border)',
            }}
          >
            Message…
          </div>
          <button
            type="button"
            aria-label="Send message"
            className="w-9 h-9 rounded-full inline-flex items-center justify-center border shrink-0 text-ink-2 hover:text-foreground transition"
            style={{
              background: 'rgba(255, 255, 255, 0.04)',
              borderColor: 'var(--color-border-strong)',
            }}
          >
            <SendArrowIcon size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

