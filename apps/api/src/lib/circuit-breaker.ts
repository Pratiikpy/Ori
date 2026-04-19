/**
 * Minimal circuit breaker.
 *
 * State machine:
 *   CLOSED    -> calls pass through normally. Count failures.
 *   OPEN      -> calls fail fast (don't hit upstream) for cooldownMs.
 *   HALF_OPEN -> let ONE probe through. If it succeeds -> CLOSED. Fail -> OPEN.
 *
 * Rolled our own rather than pulling `opossum` -- the whole thing is 60
 * lines and zero-dependency. Opossum ships percentile latency windows,
 * priority queues, etc. that we don't need.
 *
 * Usage:
 *   const breaker = new CircuitBreaker({ name: 'oracle', threshold: 5, cooldownMs: 30_000 })
 *   const data = await breaker.run(() => fetch(...).then(r => r.json()))
 */

type State = 'CLOSED' | 'OPEN' | 'HALF_OPEN'

export class CircuitBreakerOpenError extends Error {
  readonly retryAfterMs: number
  constructor(name: string, retryAfterMs: number) {
    super(`Circuit "${name}" is OPEN; retry in ${retryAfterMs}ms`)
    this.name = 'CircuitBreakerOpenError'
    this.retryAfterMs = retryAfterMs
  }
}

export type CircuitBreakerOptions = {
  name: string
  /** consecutive failures before trip */
  threshold?: number
  /** ms to stay OPEN before probing */
  cooldownMs?: number
  /** treat these error messages as non-failures (e.g. validation errors) */
  expectedErrors?: RegExp[]
}

export type CircuitBreakerSnapshot = {
  name: string
  state: State
  failures: number
  openedAt: number | null
  lastError: string | null
  lastSuccessAt: number | null
  retryAfterMs: number
}

export class CircuitBreaker {
  private state: State = 'CLOSED'
  private failures = 0
  private openedAt: number | null = null
  private lastError: string | null = null
  private lastSuccessAt: number | null = null
  private readonly name: string
  private readonly threshold: number
  private readonly cooldownMs: number
  private readonly expectedErrors: RegExp[]

  constructor(opts: CircuitBreakerOptions) {
    this.name = opts.name
    this.threshold = opts.threshold ?? 5
    this.cooldownMs = opts.cooldownMs ?? 30_000
    this.expectedErrors = opts.expectedErrors ?? []
  }

  async run<T>(fn: () => Promise<T>): Promise<T> {
    // Transition OPEN -> HALF_OPEN when cooldown elapses.
    if (this.state === 'OPEN' && this.openedAt !== null) {
      const since = Date.now() - this.openedAt
      if (since >= this.cooldownMs) {
        this.state = 'HALF_OPEN'
      } else {
        throw new CircuitBreakerOpenError(this.name, this.cooldownMs - since)
      }
    }

    try {
      const result = await fn()
      this.onSuccess()
      return result
    } catch (err) {
      this.onFailure(err)
      throw err
    }
  }

  private onSuccess(): void {
    this.failures = 0
    this.state = 'CLOSED'
    this.openedAt = null
    this.lastError = null
    this.lastSuccessAt = Date.now()
  }

  private onFailure(err: unknown): void {
    const msg = err instanceof Error ? err.message : String(err)
    // Expected errors don't trip the breaker -- e.g. 404 "pair not tracked"
    // is a predictable outcome, not an upstream outage.
    if (this.expectedErrors.some((re) => re.test(msg))) {
      return
    }
    this.lastError = msg.slice(0, 500)
    this.failures += 1
    if (this.state === 'HALF_OPEN' || this.failures >= this.threshold) {
      this.state = 'OPEN'
      this.openedAt = Date.now()
    }
  }

  snapshot(): CircuitBreakerSnapshot {
    const retryAfterMs =
      this.state === 'OPEN' && this.openedAt !== null
        ? Math.max(0, this.cooldownMs - (Date.now() - this.openedAt))
        : 0
    return {
      name: this.name,
      state: this.state,
      failures: this.failures,
      openedAt: this.openedAt,
      lastError: this.lastError,
      lastSuccessAt: this.lastSuccessAt,
      retryAfterMs,
    }
  }

  reset(): void {
    this.state = 'CLOSED'
    this.failures = 0
    this.openedAt = null
    this.lastError = null
  }
}

/**
 * Registry so /health/deep can enumerate every breaker's state in one shot.
 * New breakers auto-register via createBreaker().
 */
class CircuitBreakerRegistry {
  private readonly breakers = new Map<string, CircuitBreaker>()

  register(breaker: CircuitBreaker): void {
    this.breakers.set(breaker.snapshot().name, breaker)
  }

  snapshot(): CircuitBreakerSnapshot[] {
    return [...this.breakers.values()].map((b) => b.snapshot())
  }
}

export const circuitBreakers = new CircuitBreakerRegistry()

export function createBreaker(opts: CircuitBreakerOptions): CircuitBreaker {
  const b = new CircuitBreaker(opts)
  circuitBreakers.register(b)
  return b
}
