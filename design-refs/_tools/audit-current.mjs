/**
 * Agent 3 — current-state audit. Captures every Ori route at 3 viewports
 * from the deployed Vercel build. Forces .reveal visible, slow-scrolls,
 * full-page screenshots saved to design-refs/audit-current/.
 */
import { chromium } from 'playwright'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT_DIR = path.resolve(__dirname, '..', 'audit-current')

const BASE = 'https://ori-chi-rosy.vercel.app'

const routes = [
  '/',
  '/capabilities',
  '/flow',
  '/creators',
  '/system',
  '/today',
  '/create',
  '/streams',
  '/subscriptions',
  '/squads',
  '/lucky',
  '/paywall/new',
  '/paywall/mine',
  '/predict',
  '/send',
  '/settings',
  '/discover',
  '/chats',
  '/onboard',
  '/ask',
  '/portfolio',
]

const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 820, height: 1180 },
  { name: 'mobile', width: 375, height: 812 },
]

function slug(route) {
  if (route === '/') return 'home'
  return route.replace(/\//g, '-').replace(/^-/, '')
}

const results = []

const browser = await chromium.launch()
try {
  for (const route of routes) {
    for (const v of viewports) {
      const ctx = await browser.newContext({
        viewport: { width: v.width, height: v.height },
        deviceScaleFactor: 1,
      })
      const page = await ctx.newPage()
      const url = BASE + route
      let status = null
      let error = null
      try {
        const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
        status = resp ? resp.status() : null
        await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
        await page.addStyleTag({
          content: '.reveal{opacity:1!important;transform:none!important;}',
        }).catch(() => {})
        await page.evaluate(async () => {
          const total = document.documentElement.scrollHeight
          for (let y = 0; y <= total; y += 600) {
            window.scrollTo(0, y)
            await new Promise((r) => setTimeout(r, 60))
          }
          window.scrollTo(0, document.documentElement.scrollHeight)
          await new Promise((r) => setTimeout(r, 200))
          window.scrollTo(0, 0)
        }).catch(() => {})
        await page.waitForTimeout(700)
        const out = path.join(OUT_DIR, `${slug(route)}-${v.name}.png`)
        await page.screenshot({ path: out, fullPage: true })
        console.log(`OK  ${route} @ ${v.name}  status=${status}`)
        results.push({ route, viewport: v.name, status, ok: true })
      } catch (e) {
        error = String(e && e.message || e)
        console.log(`ERR ${route} @ ${v.name}  ${error}`)
        results.push({ route, viewport: v.name, status, ok: false, error })
        // try a partial screenshot anyway
        try {
          const out = path.join(OUT_DIR, `${slug(route)}-${v.name}.png`)
          await page.screenshot({ path: out, fullPage: true })
        } catch {}
      } finally {
        await ctx.close()
      }
    }
  }
} finally {
  await browser.close()
}

console.log('\n=== summary ===')
for (const r of results) {
  console.log(`${r.ok ? 'OK ' : 'ERR'} ${r.route} @ ${r.viewport} status=${r.status}${r.error ? ' err=' + r.error : ''}`)
}
