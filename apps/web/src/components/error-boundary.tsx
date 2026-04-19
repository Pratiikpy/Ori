'use client'

import { Component, type ReactNode } from 'react'

type Props = { children: ReactNode; fallback?: (error: Error) => ReactNode }
type State = { error: Error | null }

/**
 * Minimal error boundary — catches runtime React errors and shows a recovery
 * UI rather than a blank white screen.
 */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  override componentDidCatch(error: Error): void {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error)
  }

  override render(): ReactNode {
    if (!this.state.error) return this.props.children
    if (this.props.fallback) return this.props.fallback(this.state.error)
    return (
      <div className="min-h-dvh flex items-center justify-center p-6 text-center">
        <div className="max-w-sm">
          <h2 className="text-xl font-semibold">Something went wrong</h2>
          <p className="mt-2 text-sm text-muted-foreground">{this.state.error.message}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 rounded-full px-5 h-10 bg-primary text-primary-foreground text-sm font-medium"
          >
            Reload
          </button>
        </div>
      </div>
    )
  }
}
