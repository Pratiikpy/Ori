/**
 * One-time setup: spin up a SEPARATE chromium userdata folder with MetaMask
 * onboarded and ONLY alice's PK imported. This avoids the multi-account
 * permission caching that prevents account switching mid-session in the main
 * mm-userdata folder.
 */
import { chromium } from 'playwright'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const EXT = path.resolve(__dirname, 'metamask-ext')
const USERDATA = path.resolve(__dirname, 'mm-userdata-alice-only')
const ART = path.resolve(__dirname, 'artifacts-p1b')
fs.mkdirSync(ART, { recursive: true })
fs.rmSync(USERDATA, { recursive: true, force: true })

const PASSWORD = 'TestPass123!'
const SEED = 'test test test test test test test test test test test junk'
const ALICE_PK = '173b7e31b88d296af3974dcd12939b6706a7d101012d1a1381aab3bbaf17cbc5'

async function snap(p, n) {
  try { await p.screenshot({ path: path.join(ART, n + '.png'), fullPage: true }) } catch {}
}

async function clickBy(p, t, ms = 2000) {
  for (const sel of [`button:has-text("${t}")`, `text="${t}"`]) {
    try {
      const el = p.locator(sel).first()
      if (await el.isVisible({ timeout: ms }).catch(() => false)) {
        await el.click({ timeout: 5000 })
        return true
      }
    } catch {}
  }
  return false
}

const ctx = await chromium.launchPersistentContext(USERDATA, {
  headless: false,
  args: [
    `--disable-extensions-except=${EXT}`,
    `--load-extension=${EXT}`,
    '--disable-blink-features=AutomationControlled',
  ],
  viewport: { width: 1280, height: 800 },
})

let mm = null
for (let i = 0; i < 60; i++) {
  for (const p of ctx.pages()) {
    if (p.url().includes('home.html')) { mm = p; break }
  }
  if (mm) break
  await new Promise((r) => setTimeout(r, 500))
}
if (!mm) throw new Error('mm not found')
await mm.bringToFront()
await mm.waitForLoadState('domcontentloaded')
await mm.waitForTimeout(3000)

// Welcome → I have an existing wallet
await snap(mm, '01-welcome')
await clickBy(mm, 'I have an existing wallet')
await mm.waitForTimeout(2500)

// SRP page
await snap(mm, '02-srp-options')
await clickBy(mm, 'Import using Secret Recovery Phrase')
await mm.waitForTimeout(2500)

// Type SRP
const srp = mm.locator('textarea').first()
await srp.waitFor({ timeout: 10_000 })
await srp.click()
await srp.pressSequentially(SEED, { delay: 25 })
await snap(mm, '03-srp-filled')
await clickBy(mm, 'Continue')
await mm.waitForTimeout(3500)

// Password
await snap(mm, '04-password')
const pw = mm.locator('input[type="password"]')
await pw.first().waitFor({ timeout: 10_000 })
await pw.first().click()
await pw.first().pressSequentially(PASSWORD, { delay: 25 })
await pw.nth(1).click()
await pw.nth(1).pressSequentially(PASSWORD, { delay: 25 })
await mm.locator('#create-password-terms, input[type="checkbox"]').first().click({ force: true }).catch(() => {})
await clickBy(mm, 'Create password')
await mm.waitForTimeout(4000)

// Click through wizard to reach main UI
for (let i = 0; i < 8; i++) {
  let advanced = false
  for (const t of ['Continue', 'Done', 'Got it', 'Open wallet', 'Skip', 'Not now']) {
    if (await clickBy(mm, t)) { advanced = true; await mm.waitForTimeout(1500); break }
  }
  if (!advanced) break
}

// Force-nav to main
const cur = mm.url()
if (cur.includes('onboarding')) {
  await mm.goto(cur.split('#')[0] + '#/')
  await mm.waitForTimeout(3500)
}
await snap(mm, '05-main-ui')

// Open accounts panel + click "Add wallet" → Import account
await mm.locator('[data-testid="account-menu-icon"]').first().click({ timeout: 8000 })
await mm.waitForTimeout(1500)
await clickBy(mm, 'Add wallet')
await mm.waitForTimeout(1500)
// MM 13.26 dialog options: "Import a wallet" / "Import an account" / "Add a hardware wallet"
let importClicked = false
for (const t of ['Import an account', 'Import account', 'Import a wallet']) {
  if (await clickBy(mm, t)) { importClicked = true; break }
}
if (!importClicked) console.log('[mm] WARN no import option matched')
await mm.waitForTimeout(2000)
await snap(mm, '06-import-page')

const pkInput = mm.locator('#private-key-box, [data-testid="private-key-box"], input[type="password"], textarea').first()
await pkInput.waitFor({ timeout: 8000 })
await pkInput.click()
await pkInput.pressSequentially(ALICE_PK, { delay: 5 })
await mm.waitForTimeout(500)
for (const t of ['Import', 'Confirm']) { if (await clickBy(mm, t)) break }
await mm.waitForTimeout(3000)
await snap(mm, '07-imported-alice')

// Switch active to alice (last imported)
await mm.locator('[data-testid="account-menu-icon"]').first().click({ timeout: 5000 }).catch(() => {})
await mm.waitForTimeout(1500)
await clickBy(mm, 'Imported account 1')
await mm.waitForTimeout(2500)
await snap(mm, '08-alice-active')

console.log('✅ Onboarded MM in mm-userdata-alice-only with alice imported and active')
await mm.waitForTimeout(2000)
await ctx.close()
