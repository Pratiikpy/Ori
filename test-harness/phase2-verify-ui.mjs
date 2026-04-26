/**
 * Phase 2 verification: load alice's profile on PRODUCTION (no wallet
 * needed — public read-only) and screenshot the on-chain feed showing the
 * payment we just made.
 */
import { chromium } from 'playwright'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ART = path.resolve(__dirname, 'artifacts-p2')
fs.mkdirSync(ART, { recursive: true })

const URLS = [
  ['alice', 'https://ori-chi-rosy.vercel.app/profile/init1m57yx20zrq27r0zk28utrkctp9kdkp7s337sm4'],
  ['gas-station', 'https://ori-chi-rosy.vercel.app/profile/init1qhwsccy884xexevd29z06ps4hnay8ff6szgkt2'],
  ['validator', 'https://ori-chi-rosy.vercel.app/profile/init1hczz2agguacp2lf5cck4cx0p8ca52hw29gck2a'],
  ['explore', 'https://ori-chi-rosy.vercel.app/explore'],
]

const ctx = await chromium.launch({ headless: true })
const page = await ctx.newPage()
for (const [name, u] of URLS) {
  console.log(`\n[load] ${name}: ${u}`)
  await page.goto(u, { waitUntil: 'networkidle', timeout: 30_000 }).catch(() => {})
  await page.waitForTimeout(5000)
  const text = await page.evaluate(() => document.body.innerText.slice(0, 1800))
  console.log(`---${name} TEXT---\n${text}\n---END---`)
  const f = path.join(ART, `99-${name}-final.png`)
  await page.screenshot({ path: f, fullPage: true })
  console.log(`📸 ${f}`)
}
await ctx.close()
