/**
 * Fastify-on-Vercel adapter.
 *
 * Every HTTP request Next.js receives under /api/* lands here. We boot the
 * Fastify app lazily (cached across warm invocations), then use fastify's
 * built-in `inject()` method — designed for testing but perfectly valid in
 * production — to handle the request WITHOUT opening a socket. The response
 * is then translated into a standard Next.js `Response`.
 *
 * Why `inject()` and not a plain `app.server.emit('request', req, res)`:
 *   - serverless runtimes don't give us Node's `http.ServerResponse` with a
 *     writable stream to the client. We have a Web Request/Response pair.
 *   - `inject()` returns a payload Buffer + headers we can copy into a
 *     Web Response verbatim. No stream adaptation, no plumbing.
 *
 * Cold-start tax: first request after ~10min idle = ~1–2s (Fastify plugin
 * registration + Prisma client init). Warm = ~5–15ms per request. This is
 * the standard Prisma-on-Vercel profile.
 *
 * Shipment 1 scope: no Socket.IO, no Graphile Worker, no event-listener in
 * serverless mode. Routes that use `app.io` guard for `undefined`. Deferred
 * work runs via Supabase Edge Functions (Shipment 2).
 */
export const runtime = 'nodejs'
// Skip pre-rendering at build time. Without this, Next imports this file at
// collect-time — which would import @ori/api/server → config.ts → fail Zod
// validation against build-time env vars.
export const dynamic = 'force-dynamic'
// Longer than the Hobby default (10s) so first-request cold starts have
// headroom. Requires Vercel Pro for values > 60s; Hobby caps at 60s.
export const maxDuration = 30

// Cache the Fastify instance across warm invocations. Module-scope `let` is
// the Vercel-recommended pattern (no Node globals needed). We use `unknown`
// here rather than importing Fastify's type (avoids a type-only dep on
// fastify in the web package).
let appPromise: Promise<unknown> | null = null

async function getApp(): Promise<{
  inject: (opts: unknown) => Promise<{
    statusCode: number
    headers: Record<string, string | string[] | number | undefined>
    rawPayload: Buffer
  }>
}> {
  if (!appPromise) {
    // Dynamic import so config.ts validation only runs at request time,
    // not during Next.js build-time route collection.
    appPromise = import('@ori/api/server').then(async ({ buildApp }) => {
      const app = await buildApp()
      await app.ready()
      return app
    })
  }
  return appPromise as Promise<ReturnType<typeof getApp> extends Promise<infer T> ? T : never>
}

function originUrl(req: Request): string {
  // Fastify's routes are defined as `/v1/*` and `/health` with no `/api`
  // prefix — but Next.js mounts this catchall under `/api/[...path]`. Strip
  // the `/api` prefix so `/api/v1/auth/challenge` becomes `/v1/auth/challenge`
  // for Fastify. This lets the frontend set `NEXT_PUBLIC_API_URL=/api` in
  // Vercel and every existing API call route through this handler unchanged.
  const u = new URL(req.url)
  const path = u.pathname.replace(/^\/api(?=\/|$)/, '') || '/'
  return path + u.search
}

async function handle(req: Request): Promise<Response> {
  const app = await getApp()

  // Copy request headers into plain object — fastify.inject wants a dict.
  const headers: Record<string, string> = {}
  req.headers.forEach((v, k) => {
    headers[k] = v
  })

  // For GET/HEAD/OPTIONS there's no body. For mutating methods, read it as
  // a string — fastify will re-parse via its content-type-aware body parsers.
  const hasBody = !['GET', 'HEAD', 'OPTIONS'].includes(req.method.toUpperCase())
  const payload = hasBody ? await req.text() : undefined

  const res = await app.inject({
    method: req.method as 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS',
    url: originUrl(req),
    headers,
    payload,
  })

  // Pass through every header fastify set (CORS, content-type, set-cookie,
  // rate-limit, idempotency, etc.).
  const outHeaders = new Headers()
  for (const [k, v] of Object.entries(res.headers)) {
    if (v === undefined) continue
    if (Array.isArray(v)) {
      for (const item of v) outHeaders.append(k, String(item))
    } else {
      outHeaders.set(k, String(v))
    }
  }

  // res.rawPayload is a Node Buffer. Cast via ArrayBuffer so TS accepts it
  // as BodyInit. All our API responses are JSON or text -- we don't serve
  // binary. If that changes, use rawPayload directly as a Uint8Array view.
  const ab = res.rawPayload.buffer.slice(
    res.rawPayload.byteOffset,
    res.rawPayload.byteOffset + res.rawPayload.byteLength,
  ) as ArrayBuffer
  return new Response(ab, {
    status: res.statusCode,
    headers: outHeaders,
  })
}

export async function GET(req: Request): Promise<Response> {
  return handle(req)
}
export async function POST(req: Request): Promise<Response> {
  return handle(req)
}
export async function PUT(req: Request): Promise<Response> {
  return handle(req)
}
export async function PATCH(req: Request): Promise<Response> {
  return handle(req)
}
export async function DELETE(req: Request): Promise<Response> {
  return handle(req)
}
export async function OPTIONS(req: Request): Promise<Response> {
  return handle(req)
}
export async function HEAD(req: Request): Promise<Response> {
  return handle(req)
}
