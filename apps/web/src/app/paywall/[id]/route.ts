/**
 * x402 gated content — HTTP Payment Required flow.
 *
 * GET  /paywall/[id]                   → 402 with payment instructions
 * GET  /paywall/[id]?buyer=init1…      → checks `paywall::has_access` on-chain
 *                                       and returns gated markdown if purchased,
 *                                       otherwise 402 with instructions
 *
 * Matches the InitPage / x402 specification: we set the `X-Payment-Required`
 * header with the price + denom + call instructions so an HTTP-level client
 * (or agent) can automate the purchase via `paywall::purchase(paywall_id)`.
 *
 * Reference: reference-projects/initpage/apps/gateway — this is our version
 * of their HTTP 402 wire protocol, backed by our on-chain `paywall.move`.
 */
import { RESTClient, bcs } from '@initia/initia.js'
import {
  L1_REST_URL,
  ORI_DENOM,
  ORI_MODULE_ADDRESS,
  ORI_REST_URL,
  ORI_CHAIN_ID,
  L1_CHAIN_ID,
} from '@/lib/chain-config'

// Running on a chain that is itself L1 in our testnet config, so both URLs
// point at the same host; keep the constants so mainnet split is cheap.
const rest = new RESTClient(ORI_REST_URL, { chainId: ORI_CHAIN_ID })
// `L1_REST_URL` is imported for future split, currently identical — silence noop.
void L1_REST_URL
void L1_CHAIN_ID

type OnChainPaywall = {
  creator: string
  title: string
  resource_uri: string
  price: string
  denom: string
  purchases: string
  gross_revenue: string
  active: boolean
}

async function loadPaywall(paywallId: bigint): Promise<OnChainPaywall | null> {
  try {
    const res = await rest.move.view(
      ORI_MODULE_ADDRESS,
      'paywall',
      'get_paywall',
      [],
      [bcs.u64().serialize(paywallId.toString()).toBase64()],
    )
    const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data
    // `get_paywall` returns a tuple; initia.js surfaces it as an array in view
    // responses. Coerce both shapes.
    if (Array.isArray(data)) {
      const [creator, title, resource_uri, price, denom, purchases, gross_revenue, active] = data as [
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        boolean,
      ]
      return { creator, title, resource_uri, price, denom, purchases, gross_revenue, active }
    }
    if (data && typeof data === 'object') {
      return data as OnChainPaywall
    }
    return null
  } catch {
    return null
  }
}

async function hasAccess(paywallId: bigint, buyer: string): Promise<boolean> {
  try {
    const res = await rest.move.view(
      ORI_MODULE_ADDRESS,
      'paywall',
      'has_access',
      [],
      [
        bcs.u64().serialize(paywallId.toString()).toBase64(),
        bcs.address().serialize(buyer).toBase64(),
      ],
    )
    const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data
    return data === true
  } catch {
    return false
  }
}

/**
 * Resource-type dispatch for gated content.
 *
 * We extend the x402 pattern — beyond "serve markdown" — so the same paywall
 * primitive can gate any HTTP-visible content. The on-chain `resource_uri`
 * field is free-text; we read its prefix to pick a mode. All modes are
 * backward-compatible: an unprefixed `https://…` or `ipfs://…` or bare text
 * still renders as before.
 *
 * Supported modes:
 *   - `article:<url|text>`  → fetched text, served as text/markdown (default)
 *   - `html:<url>`          → fetched HTML, served as text/html
 *   - `file:<url>`          → binary proxy with original Content-Type and a
 *                             Content-Disposition attachment header
 *   - `api:<url>`           → JSON API proxy, preserves Content-Type
 *   - `ipfs://…`            → proxied through ipfs.io, detected by extension
 *   - `https?://…`          → legacy default, served as text/markdown
 *   - bare text             → inline markdown, served as text/markdown
 *
 * SSRF posture: all outbound fetches go through `safeFetch`, which blocks
 * non-public hostnames (localhost, private IP ranges, link-local) so a
 * creator can't use the gateway to pivot into the web server's network.
 */
type ResourceMode = 'article' | 'html' | 'file' | 'api' | 'inline'

type ResolvedResource = {
  mode: ResourceMode
  url: string | null // null means inline (value is the content itself)
  filenameHint: string | null
}

function parseResourceUri(raw: string): ResolvedResource {
  const s = raw.trim()
  const split = (tag: string): string | null =>
    s.startsWith(tag) ? s.slice(tag.length).trim() : null

  const fileTarget = split('file:')
  if (fileTarget !== null) {
    const filename = filenameFromUrl(fileTarget)
    return { mode: 'file', url: fileTarget, filenameHint: filename }
  }
  const apiTarget = split('api:')
  if (apiTarget !== null) return { mode: 'api', url: apiTarget, filenameHint: null }
  const htmlTarget = split('html:')
  if (htmlTarget !== null) return { mode: 'html', url: htmlTarget, filenameHint: null }
  const articleTarget = split('article:')
  if (articleTarget !== null) {
    if (articleTarget.startsWith('http://') || articleTarget.startsWith('https://') || articleTarget.startsWith('ipfs://')) {
      return { mode: 'article', url: articleTarget, filenameHint: null }
    }
    // article:<text> — inline
    return { mode: 'inline', url: null, filenameHint: null }
  }
  if (s.startsWith('ipfs://')) {
    const cid = s.slice('ipfs://'.length)
    return { mode: 'article', url: `https://ipfs.io/ipfs/${cid}`, filenameHint: null }
  }
  if (s.startsWith('https://') || s.startsWith('http://')) {
    return { mode: 'article', url: s, filenameHint: null }
  }
  return { mode: 'inline', url: null, filenameHint: null }
}

function filenameFromUrl(u: string): string | null {
  try {
    const path = new URL(u).pathname
    const last = path.split('/').filter(Boolean).pop()
    return last && last.includes('.') ? last : null
  } catch {
    return null
  }
}

const PRIVATE_IP_RE =
  /^(10\.|127\.|192\.168\.|169\.254\.|0\.|224\.|::1$|fe80:|fc00:|fd00:|localhost$)/i

async function safeFetch(target: string, init?: RequestInit): Promise<Response> {
  // Allow ipfs.io + https + http but reject private-network hosts. Good-
  // enough SSRF guard for an untrusted creator-supplied URL. For production
  // we'd pair this with a per-creator rate limit.
  const url = new URL(target)
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error(`unsupported scheme: ${url.protocol}`)
  }
  if (PRIVATE_IP_RE.test(url.hostname)) {
    throw new Error(`blocked private host: ${url.hostname}`)
  }
  return fetch(target, init)
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params
  const paywallId = (() => {
    try {
      return BigInt(id)
    } catch {
      return null
    }
  })()
  if (paywallId === null || paywallId <= 0n) {
    return new Response(JSON.stringify({ error: 'INVALID_PAYWALL_ID' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const pw = await loadPaywall(paywallId)
  if (!pw) {
    return new Response(JSON.stringify({ error: 'PAYWALL_NOT_FOUND' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  if (!pw.active) {
    return new Response(JSON.stringify({ error: 'PAYWALL_INACTIVE' }), {
      status: 410,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const url = new URL(request.url)
  const buyer = url.searchParams.get('buyer')
  const requireJson = (request.headers.get('Accept') ?? '').includes('application/json')

  // Previewed resource mode is included in 402 headers so an agent can decide
  // whether to spend — e.g., refuse to pay for a `file` if it wanted `api`.
  const previewMode = parseResourceUri(pw.resource_uri).mode

  // x402 headers — embeddable so agents can automate the purchase.
  const x402Headers: Record<string, string> = {
    'X-Payment-Required': 'true',
    'X-Payment-Amount': pw.price,
    'X-Payment-Denom': pw.denom || ORI_DENOM,
    'X-Payment-Recipient': pw.creator,
    'X-Payment-Contract': `${ORI_MODULE_ADDRESS}::paywall::purchase`,
    'X-Payment-Arg-Paywall-Id': id,
    'X-Payment-Title': pw.title,
    'X-Payment-Resource-Mode': previewMode,
    'X-Payment-Scope': 'pay-once',
    'Cache-Control': 'no-store',
  }

  // No buyer supplied → 402 regardless of purchase state.
  if (!buyer) {
    return new Response(
      requireJson
        ? JSON.stringify({
            status: 402,
            paywall_id: id,
            title: pw.title,
            price: pw.price,
            denom: pw.denom || ORI_DENOM,
            contract: `${ORI_MODULE_ADDRESS}::paywall::purchase`,
            args: { paywall_id: id },
            instructions:
              'Call the contract above, then request this URL again with ?buyer=<your-init1-address>.',
          })
        : paywallPageHtml({ id, title: pw.title, price: pw.price, denom: pw.denom || ORI_DENOM }),
      {
        status: 402,
        headers: {
          ...x402Headers,
          'Content-Type': requireJson ? 'application/json' : 'text/html; charset=utf-8',
        },
      },
    )
  }

  const purchased = await hasAccess(paywallId, buyer)
  if (!purchased) {
    return new Response(
      JSON.stringify({
        status: 402,
        paywall_id: id,
        buyer,
        hint: 'Call paywall::purchase with this id from the buyer address, then retry.',
      }),
      {
        status: 402,
        headers: { ...x402Headers, 'Content-Type': 'application/json' },
      },
    )
  }

  const resolved = parseResourceUri(pw.resource_uri)
  const baseHeaders: Record<string, string> = {
    'X-Paywall-Id': id,
    'X-Paywall-Buyer': buyer,
    'X-Paywall-Mode': resolved.mode,
    // `pay-once` means the agent can cache the unlock; `pay-per-request`
    // would force re-payment each fetch. We're pay-once today — the buyer
    // field in the URL is the caching key. Future paywall subtypes (usage
    // metered) would switch this to `pay-per-request`.
    'X-Payment-Scope': 'pay-once',
    'Cache-Control': 'private, max-age=60',
  }

  try {
    if (resolved.mode === 'inline') {
      return new Response(pw.resource_uri, {
        status: 200,
        headers: { ...baseHeaders, 'Content-Type': 'text/markdown; charset=utf-8' },
      })
    }
    if (!resolved.url) throw new Error('resolver produced no URL for non-inline mode')
    const upstream = await safeFetch(resolved.url)
    if (!upstream.ok) throw new Error(`upstream ${upstream.status}`)

    if (resolved.mode === 'file') {
      // Stream bytes straight through with the original content-type so PDFs,
      // zips, mp4s, images download intact. Disposition header triggers the
      // browser "Save As" dialog instead of inline rendering.
      const ct = upstream.headers.get('Content-Type') ?? 'application/octet-stream'
      const filename = resolved.filenameHint ?? `paywall-${id}.bin`
      return new Response(upstream.body, {
        status: 200,
        headers: {
          ...baseHeaders,
          'Content-Type': ct,
          'Content-Disposition': `attachment; filename="${filename.replaceAll('"', '')}"`,
        },
      })
    }
    if (resolved.mode === 'api') {
      // JSON / structured API proxy. Preserves the upstream Content-Type so
      // agents can parse the response exactly as if they hit the origin.
      const ct = upstream.headers.get('Content-Type') ?? 'application/json'
      const text = await upstream.text()
      return new Response(text, {
        status: 200,
        headers: { ...baseHeaders, 'Content-Type': ct },
      })
    }
    if (resolved.mode === 'html') {
      const text = await upstream.text()
      return new Response(text, {
        status: 200,
        headers: { ...baseHeaders, 'Content-Type': 'text/html; charset=utf-8' },
      })
    }
    // article — default mode (markdown or plain text).
    const text = await upstream.text()
    return new Response(text, {
      status: 200,
      headers: { ...baseHeaders, 'Content-Type': 'text/markdown; charset=utf-8' },
    })
  } catch (e) {
    const fallback = `# ${pw.title}\n\n_(failed to load upstream: ${(e as Error).message})_`
    return new Response(fallback, {
      status: 200,
      headers: { ...baseHeaders, 'Content-Type': 'text/markdown; charset=utf-8' },
    })
  }
}

function paywallPageHtml({
  id,
  title,
  price,
  denom,
}: {
  id: string
  title: string
  price: string
  denom: string
}): string {
  const sym = denom.startsWith('u') ? denom.slice(1).toUpperCase() : denom.toUpperCase()
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)} - Paywall #${id}</title>
<style>
  body{background:#060606;color:#f5f5f5;font:500 16px/1.5 -apple-system,system-ui,sans-serif;margin:0;padding:48px 24px;display:flex;min-height:100vh;align-items:center;justify-content:center}
  .card{max-width:420px;width:100%;padding:32px;border:1px solid #1f1f1f;border-radius:20px;background:#0b0b0b}
  h1{margin:0 0 6px;font-size:20px}
  .tag{display:inline-block;padding:3px 10px;border-radius:999px;background:#1a1a1a;color:#9a9a9a;font-size:11px;letter-spacing:.02em;margin-bottom:14px}
  .price{font-size:40px;font-weight:800;letter-spacing:-.02em;margin:16px 0 4px}
  .sub{color:#9a9a9a;font-size:13px}
  a.btn{display:block;margin-top:24px;text-align:center;padding:14px;background:#4349ff;color:white;border-radius:16px;text-decoration:none;font-weight:600}
  code{font-family:"JetBrains Mono",ui-monospace,monospace;background:#1a1a1a;padding:2px 8px;border-radius:6px;font-size:12px}
  .meta{margin-top:20px;font-size:12px;color:#6a6a6a;line-height:1.6}
</style>
</head><body>
<div class="card">
  <div class="tag">Paywall #${id} - x402</div>
  <h1>${escapeHtml(title)}</h1>
  <div class="sub">Locked until paid. Settles in one on-chain call.</div>
  <div class="price">${price} <span style="font-size:16px;color:#9a9a9a">${sym}</span></div>
  <a class="btn" href="/paywall/${id}/pay">Unlock</a>
  <div class="meta">
    Programmatic access: call <code>paywall::purchase</code> with id <code>${id}</code>,
    then <code>GET ?buyer=init1…</code> to receive the content.
  </div>
</div>
</body></html>`
}

function escapeHtml(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}
