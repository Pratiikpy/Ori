/**
 * Root loading screen — shown by Next.js during route transitions before
 * the matched page's RSC streams in. Previously this was an unstyled
 * "Loading…" string on a white page, which read like a broken deploy.
 *
 * Replaced with a centered Ori mark + a pulsing bar. No spinner — the
 * page lifecycle is short enough (< 1s on a warm cache) that an animated
 * spinner is more visual noise than helpful. The pulsing bar gives a
 * subtle "alive" signal via Tailwind's animate-pulse.
 *
 * Server component (no styled-jsx) so it streams as HTML on the wire.
 */
export default function Loading() {
  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center bg-white text-[#0A0A0A]"
      role="status"
      aria-busy="true"
      aria-label="Loading Ori"
      data-testid="root-loading"
    >
      <div className="grid h-20 w-20 place-items-center bg-[#0022FF] font-heading text-4xl font-black text-white">
        O
      </div>
      <p className="mt-6 font-heading text-2xl font-black tracking-tight">Ori</p>
      <p className="mt-2 font-mono text-xs uppercase tracking-[0.2em] text-[#52525B]">
        Loading
      </p>
      <div
        className="mt-6 h-[2px] w-40 animate-pulse bg-[#0022FF]"
        aria-hidden="true"
      />
    </main>
  )
}
