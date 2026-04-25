/**
 * Reference screenshot script — captures Ori-landing.html and standalone
 * at desktop / tablet / mobile so source-shots/ is populated before we
 * audit anything. Required by §10 / Phase 0 gate.
 */
import { chromium } from 'playwright'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..', '..')

const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 820, height: 1180 },
  { name: 'mobile', width: 375, height: 812 },
]

const sources = [
  { file: 'design-refs/source/Ori-landing.html', stem: 'landing' },
  { file: 'design-refs/source/Ori_-_standalone.html', stem: 'standalone' },
]

const browser = await chromium.launch()
try {
  for (const src of sources) {
    const url = 'file:///' + path.resolve(ROOT, src.file).replace(/\\/g, '/')
    for (const v of viewports) {
      const ctx = await browser.newContext({
        viewport: { width: v.width, height: v.height },
        deviceScaleFactor: 1,
      })
      const page = await ctx.newPage()
      await page.goto(url)
      await page.waitForLoadState('networkidle').catch(() => {})
      // Force every .reveal visible — the reference uses
      // IntersectionObserver-driven opacity-0 → 1 fade-in. Without this
      // a fullPage screenshot shows black for everything below the fold.
      await page.addStyleTag({
        content: '.reveal{opacity:1!important;transform:none!important;}',
      })
      // Slow-scroll to nudge any lazy / parallax observers, then snap back.
      await page.evaluate(async () => {
        const total = document.documentElement.scrollHeight
        for (let y = 0; y <= total; y += 600) {
          window.scrollTo(0, y)
          await new Promise((r) => setTimeout(r, 60))
        }
        window.scrollTo(0, 0)
      })
      await page.waitForTimeout(800)
      const out = path.join(
        ROOT,
        'design-refs',
        'source-shots',
        `${src.stem}-${v.name}.png`
      )
      await page.screenshot({ path: out, fullPage: true })
      console.log(`✓ ${out}`)
      await ctx.close()
    }
  }
} finally {
  await browser.close()
}
