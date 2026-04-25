/**
 * Phase 4 Lighthouse audit — runs against marketing routes at mobile preset.
 * Outputs: design-refs/PERF.md (summary) + raw JSON in playwright/perf-*.json
 */
import lighthouse from 'lighthouse'
import * as chromeLauncher from 'chrome-launcher'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { writeFileSync, mkdirSync } from 'node:fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const OUT_DIR = path.join(ROOT, 'playwright')
mkdirSync(OUT_DIR, { recursive: true })

const BASE = 'https://ori-chi-rosy.vercel.app'
const routes = ['/', '/capabilities', '/flow', '/creators', '/system']

function slug(r) {
  if (r === '/') return 'home'
  return r.replace(/\//g, '-').replace(/^-/, '')
}

const chrome = await chromeLauncher.launch({
  chromeFlags: ['--headless=new', '--no-sandbox'],
})

const opts = {
  port: chrome.port,
  output: 'json',
  logLevel: 'error',
  onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
}

const config = {
  extends: 'lighthouse:default',
  settings: {
    formFactor: 'mobile',
    throttling: {
      rttMs: 150,
      throughputKbps: 1638.4,
      cpuSlowdownMultiplier: 4,
    },
    screenEmulation: {
      mobile: true,
      width: 412,
      height: 823,
      deviceScaleFactor: 1.75,
      disabled: false,
    },
    emulatedUserAgent:
      'Mozilla/5.0 (Linux; Android 11; moto g power (2022)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Mobile Safari/537.36',
  },
}

const summary = []

try {
  for (const route of routes) {
    const url = BASE + route
    console.log(`Lighthouse: ${url}`)
    const r = await lighthouse(url, opts, config)
    const lhr = r.lhr
    const out = {
      route,
      url,
      perf: Math.round((lhr.categories.performance?.score ?? 0) * 100),
      a11y: Math.round((lhr.categories.accessibility?.score ?? 0) * 100),
      bp: Math.round((lhr.categories['best-practices']?.score ?? 0) * 100),
      seo: Math.round((lhr.categories.seo?.score ?? 0) * 100),
      lcp: lhr.audits['largest-contentful-paint']?.numericValue,
      cls: lhr.audits['cumulative-layout-shift']?.numericValue,
      tbt: lhr.audits['total-blocking-time']?.numericValue,
      fcp: lhr.audits['first-contentful-paint']?.numericValue,
      si: lhr.audits['speed-index']?.numericValue,
    }
    summary.push(out)
    writeFileSync(
      path.join(OUT_DIR, `perf-${slug(route)}-mobile.json`),
      JSON.stringify(lhr, null, 2)
    )
    console.log(
      `  perf=${out.perf}  a11y=${out.a11y}  bp=${out.bp}  seo=${out.seo}  lcp=${Math.round(out.lcp)}ms  cls=${out.cls.toFixed(3)}`
    )
  }
} finally {
  chrome.kill()
}

// Build PERF.md
let md = `# PERF — Lighthouse mobile (4G throttle, ×4 CPU slowdown)\n\n`
md += `Run target: \`${BASE}\` · ${new Date().toISOString()}\n\n`
md += `## Summary\n\n| Route | Perf | A11y | BP | SEO | LCP | CLS | TBT |\n|---|---:|---:|---:|---:|---:|---:|---:|\n`
for (const s of summary) {
  md += `| \`${s.route}\` | ${s.perf} | ${s.a11y} | ${s.bp} | ${s.seo} | ${Math.round(s.lcp)}ms | ${s.cls.toFixed(3)} | ${Math.round(s.tbt)}ms |\n`
}
md += `\n## Per-route\n\n`
for (const s of summary) {
  md += `### ${s.route}\n\n`
  md += `- Performance: **${s.perf}** ${s.perf >= 90 ? '✅' : s.perf >= 80 ? '⚠️' : '❌'}\n`
  md += `- Accessibility: **${s.a11y}** ${s.a11y >= 95 ? '✅' : s.a11y >= 85 ? '⚠️' : '❌'}\n`
  md += `- Best Practices: **${s.bp}** ${s.bp >= 95 ? '✅' : s.bp >= 85 ? '⚠️' : '❌'}\n`
  md += `- SEO: **${s.seo}** ${s.seo >= 90 ? '✅' : s.seo >= 80 ? '⚠️' : '❌'}\n`
  md += `- LCP: ${Math.round(s.lcp)}ms ${s.lcp <= 2500 ? '✅' : s.lcp <= 4000 ? '⚠️' : '❌'} (target ≤ 2500ms)\n`
  md += `- CLS: ${s.cls.toFixed(3)} ${s.cls <= 0.1 ? '✅' : s.cls <= 0.25 ? '⚠️' : '❌'} (target ≤ 0.1)\n`
  md += `- TBT: ${Math.round(s.tbt)}ms ${s.tbt <= 200 ? '✅' : s.tbt <= 600 ? '⚠️' : '❌'} (target ≤ 200ms)\n`
  md += `- FCP: ${Math.round(s.fcp)}ms\n`
  md += `- Speed Index: ${Math.round(s.si)}ms\n\n`
}
writeFileSync(path.join(ROOT, 'PERF.md'), md)
console.log('\nWrote PERF.md')
