/**
 * Route-level loading skeleton — Apple-style soft pulse.
 *
 * Renders while a server component on the route is suspended. Mirrors the
 * spacing of a typical AppShell page so users get visual continuity rather
 * than a layout-shift "now content arrives" jolt.
 */
export default function Loading() {
  return (
    <div className="relative min-h-dvh bg-ambient">
      <div className="lg:pl-72">
        <div className="mx-auto w-full max-w-5xl px-5 sm:px-8 lg:px-10 py-8 lg:py-12">
          {/* Title skeleton */}
          <div className="h-9 w-48 rounded-full bg-black/[0.06] animate-pulse" />
          <div className="mt-3 h-4 w-72 rounded-full bg-black/[0.04] animate-pulse" />

          {/* Card skeletons */}
          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="md:col-span-2 h-40 rounded-[2rem] glass-card animate-pulse" />
            <div className="h-40 rounded-[2rem] glass-card animate-pulse" />
          </div>
          <div className="mt-5 h-32 rounded-[2rem] glass-card animate-pulse" />
        </div>
      </div>
    </div>
  )
}
