/**
 * Phase 4 verification — runs axe-core + writes a per-route pass/fail
 * snapshot. Lighthouse runs in a separate script (perf.mjs) since it
 * needs to fully boot a Chrome with throttling.
 *
 * Outputs:
 * - design-refs/A11Y.md (per-route axe-core results)
 * - design-refs/playwright/axe-{slug}-{viewport}.json (raw)
 */
import { chromium } from 'playwright'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { writeFileSync, mkdirSync } from 'node:fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const OUT_DIR = path.join(ROOT, 'playwright')
mkdirSync(OUT_DIR, { recursive: true })

const BASE = 'https://ori-chi-rosy.vercel.app'

// Marketing routes only — app routes are wallet-gated and redirect to /
// when not connected, so axe runs against the home, not the actual page.
const routes = ['/', '/capabilities', '/flow', '/creators', '/system']

const viewport = { width: 1440, height: 900 } // axe results don't change much across breakpoints; one is enough

function slug(r) {
  if (r === '/') return 'home'
  return r.replace(/\//g, '-').replace(/^-/, '')
}

// Inline axe-core 4.10 minified script — ~700KB, but loaded once per page.
// We fetch the published version directly from cdnjs at runtime.
const AXE_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.2/axe.min.js'

const summary = []

const browser = await chromium.launch()
try {
  for (const route of routes) {
    const ctx = await browser.newContext({ viewport })
    const page = await ctx.newPage()
    const url = BASE + route
    let result = { route, route_url: url, ok: false }
    try {
      const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
      result.status = resp ? resp.status() : null
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
      // inject axe
      await page.addScriptTag({ url: AXE_CDN })
      // run with WCAG 2.1 AA + best-practice
      const r = await page.evaluate(async () => {
        // @ts-ignore
        const out = await window.axe.run(document, {
          runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice'] },
        })
        return {
          violations: out.violations.map((v) => ({
            id: v.id,
            impact: v.impact,
            help: v.help,
            helpUrl: v.helpUrl,
            nodes: v.nodes.length,
            sample: v.nodes.slice(0, 2).map((n) => n.target.join(' ')),
          })),
          passes: out.passes.length,
          incomplete: out.incomplete.length,
        }
      })
      result.ok = true
      result.violations = r.violations
      result.passes = r.passes
      result.incomplete = r.incomplete
      writeFileSync(
        path.join(OUT_DIR, `axe-${slug(route)}-desktop.json`),
        JSON.stringify(r, null, 2)
      )
      console.log(
        `${r.violations.length === 0 ? 'PASS' : 'WARN'} ${route} — ${r.violations.length} violations, ${r.passes} passes`
      )
    } catch (e) {
      result.error = String((e && e.message) || e)
      console.log(`ERR  ${route}  ${result.error}`)
    } finally {
      summary.push(result)
      await ctx.close()
    }
  }
} finally {
  await browser.close()
}

// Build A11Y.md
let md = `# A11Y — axe-core (WCAG 2.1 AA + best-practice)\n\n`
md += `Run target: \`${BASE}\` · viewport 1440×900 · post-deploy ${new Date().toISOString()}\n\n`
md += `## Summary\n\n| Route | Violations | Passes | Incomplete |\n|---|---:|---:|---:|\n`
for (const r of summary) {
  md += `| \`${r.route}\` | ${r.violations ? r.violations.length : 'err'} | ${r.passes ?? '-'} | ${r.incomplete ?? '-'} |\n`
}
md += `\n`
for (const r of summary) {
  md += `## ${r.route}\n\n`
  if (r.error) {
    md += `Error: ${r.error}\n\n`
    continue
  }
  if (r.violations.length === 0) {
    md += `✓ 0 violations.\n\n`
    continue
  }
  for (const v of r.violations) {
    md += `### ${v.impact ?? 'minor'} · ${v.id}\n${v.help}\n\nNodes affected: ${v.nodes}. Sample selectors:\n`
    for (const s of v.sample) md += `- \`${s}\`\n`
    md += `\nDocs: ${v.helpUrl}\n\n`
  }
}
writeFileSync(path.join(ROOT, 'A11Y.md'), md)
console.log('\nWrote A11Y.md')
