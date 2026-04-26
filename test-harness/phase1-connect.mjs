/**
 * Phase 1: real wallet connection.
 *
 * Launches Chromium with the local MetaMask extension loaded, runs the
 * MetaMask onboarding (fresh wallet, password = TestPass123!), imports
 * gas-station + alice private keys as additional accounts, then opens the Ori
 * dev server and clicks Connect Wallet to verify MetaMask appears in
 * InterwovenKit's drawer.
 *
 * Real wallet, real signing, real broadcast. No mocks.
 */
import { chromium } from 'playwright'
import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const EXT_PATH = path.resolve(__dirname, 'metamask-ext')
const USER_DATA = path.resolve(__dirname, 'mm-userdata')
const ART = path.resolve(__dirname, 'artifacts')
fs.mkdirSync(ART, { recursive: true })

const PASSWORD = 'TestPass123!'
const GAS_STATION_PK = '7d29c568ed93672999b7c73ef1391a1c8f056e142269b7dc5951de040a932e77'
const ALICE_PK = '173b7e31b88d296af3974dcd12939b6706a7d101012d1a1381aab3bbaf17cbc5'

const APP_URL = process.env.APP_URL ?? 'http://localhost:3000'

async function snap(page, name) {
  const f = path.join(ART, `${name}.png`)
  await page.screenshot({ path: f, fullPage: true }).catch(() => {})
  console.log(`  📸 ${f}`)
}

async function waitForMetaMaskOnboarding(context, timeoutMs = 30_000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const pages = context.pages()
    for (const p of pages) {
      const url = p.url()
      if (url.includes('chrome-extension://') && url.includes('home.html')) {
        return p
      }
    }
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error('MetaMask onboarding tab did not appear in 30s')
}

async function clickByText(page, text, role = null) {
  // Try common patterns. Returns true if clicked.
  const selectors = [
    role ? `${role}:has-text("${text}")` : null,
    `button:has-text("${text}")`,
    `[data-testid*="${text.toLowerCase().replace(/ /g, '-')}"]`,
    `text="${text}"`,
  ].filter(Boolean)
  for (const sel of selectors) {
    try {
      const el = await page.locator(sel).first()
      if (await el.isVisible({ timeout: 1000 }).catch(() => false)) {
        await el.click({ timeout: 5000 })
        return true
      }
    } catch {
      /* try next */
    }
  }
  return false
}

// Hardhat default test mnemonic — well-known, never use for real funds.
// Onboards a "primary" wallet we don't care about; gas-station + alice are
// imported as separate accounts afterwards.
const SEED_PHRASE = 'test test test test test test test test test test test junk'

async function onboardMetaMask(page) {
  console.log('[mm] starting onboarding')
  await page.bringToFront()
  await page.waitForLoadState('domcontentloaded')
  await page.waitForTimeout(3000)

  // Page 1: "Create a new wallet" / "I have an existing wallet"
  await snap(page, '00-mm-welcome')
  if (!(await clickByText(page, 'I have an existing wallet'))) {
    // try data-testid
    await page.locator('[data-testid="onboarding-import-wallet"]').click({ timeout: 5000 }).catch(() => {})
  }
  console.log('[mm] picked existing wallet')
  await page.waitForTimeout(2500)

  // Page 2: "Import using Secret Recovery Phrase"
  await snap(page, '01-mm-srp-page')
  let pickedSrp = false
  for (const t of [
    'Import using Secret Recovery Phrase',
    'Use Secret Recovery Phrase',
    'Import wallet',
  ]) {
    if (await clickByText(page, t)) {
      pickedSrp = true
      console.log(`[mm] picked SRP path: "${t}"`)
      break
    }
  }
  if (!pickedSrp) console.warn('[mm] WARNING: could not find SRP button')
  await page.waitForTimeout(2500)

  // MetaMask 13.26+ uses a SINGLE textarea. fill() doesn't fire React's
  // onChange under LavaMoat hardening, so the Continue button stays disabled.
  // pressSequentially fires real key events that the React handler picks up.
  const textarea = page.locator('textarea').first()
  await textarea.waitFor({ timeout: 10_000 })
  await textarea.click()
  await textarea.pressSequentially(SEED_PHRASE, { delay: 25 })
  console.log('[mm] typed SRP into textarea')
  await page.waitForTimeout(500)
  await snap(page, '02-mm-srp-filled')

  // Continue
  for (const t of ['Continue', 'Confirm Secret Recovery Phrase', 'Import wallet']) {
    if (await clickByText(page, t)) {
      console.log(`[mm] clicked "${t}"`)
      break
    }
  }
  await page.waitForTimeout(3500)

  // Password — use pressSequentially for the same React-onChange reason.
  await snap(page, '03-mm-after-password')
  const pwInputs = page.locator('input[type="password"]')
  await pwInputs.first().waitFor({ timeout: 10_000 })
  const pwCount = await pwInputs.count()
  console.log(`[mm] found ${pwCount} password inputs`)
  await pwInputs.first().click()
  await pwInputs.first().pressSequentially(PASSWORD, { delay: 25 })
  if (pwCount > 1) {
    await pwInputs.nth(1).click()
    await pwInputs.nth(1).pressSequentially(PASSWORD, { delay: 25 })
  }
  // Terms checkbox — the actual <input> is opacity-0 behind a wrapping div
  // that intercepts pointer events. Force-click to bypass actionability checks.
  const checkbox = page.locator('#create-password-terms, input[type="checkbox"]').first()
  if (await checkbox.count() > 0) {
    await checkbox.click({ force: true }).catch(() => {})
    console.log('[mm] checked terms box (force)')
  }
  await page.waitForTimeout(500)
  await snap(page, '03b-mm-password-filled')
  for (const t of ['Create password', 'Create new wallet', 'Create', 'Import wallet']) {
    if (await clickByText(page, t)) {
      console.log(`[mm] clicked "${t}"`)
      break
    }
  }
  await page.waitForTimeout(4000)

  // The "Your wallet is ready!" screen sometimes has an "Open wallet" button
  // gated behind background work. Force-click attempt then bypass via direct
  // URL navigation to the main wallet UI.
  for (let i = 0; i < 3; i++) {
    const openBtn = page.locator('button', { hasText: 'Open wallet' }).first()
    if (await openBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await openBtn.click({ force: true }).catch(() => {})
      console.log('[mm] clicked Open wallet (force)')
      await page.waitForTimeout(2500)
    }
    let advanced = false
    for (const t of ['Continue', 'Done', 'Next', 'Got it']) {
      if (await clickByText(page, t)) {
        advanced = true
        await page.waitForTimeout(1500)
        break
      }
    }
    if (!advanced) break
  }

  // Bypass any remaining wizard by direct nav to main wallet UI
  const cur = page.url()
  if (cur.includes('onboarding')) {
    const base = cur.split('#')[0]
    console.log('[mm] forcing nav to home.html#/')
    await page.goto(`${base}#/`)
    await page.waitForTimeout(3500)
  }

  await page.waitForTimeout(2000)
  await snap(page, '04-mm-onboarded')
  console.log('[mm] onboarding complete')

  // Dismiss any post-open dialogs
  for (const t of ['No thanks', 'Got it', 'Close', 'Skip', 'Not now']) {
    await clickByText(page, t)
  }
  await page.waitForTimeout(2000)
  await snap(page, '04b-mm-main-ui')
}

async function importAccount(page, pk, label) {
  console.log(`[mm] importing ${label}`)

  // Open accounts panel: click the account name dropdown ("Hardhat 1 ▾").
  // Try multiple selectors — the chevron has data-testid in newer MM.
  let opened = false
  for (const sel of [
    '[data-testid="account-menu-icon"]',
    '[data-testid="account-options-menu-button"]',
    'button[data-testid*="account"]',
  ]) {
    const el = page.locator(sel).first()
    if (await el.isVisible({ timeout: 1500 }).catch(() => false)) {
      await el.click()
      console.log(`[mm] opened accounts via ${sel}`)
      opened = true
      break
    }
  }
  if (!opened) {
    // Click the account name text directly
    await page.locator('text=Hardhat 1').first().click({ force: true }).catch(() => {})
    console.log('[mm] clicked Hardhat 1 (force)')
  }
  await page.waitForTimeout(1500)
  await snap(page, `mm-acct-list-${label}`)

  // Click "Add wallet" (NOT "Add account" — that auto-derives from the SRP)
  for (const t of ['Add wallet', 'Add account or hardware wallet']) {
    if (await clickByText(page, t)) {
      console.log(`[mm] clicked "${t}"`)
      break
    }
  }
  await page.waitForTimeout(1500)
  await snap(page, `mm-add-acct-options-${label}`)

  // Click "Private key"
  for (const t of ['Private Key', 'Private key', 'Import account', 'Import a private key']) {
    if (await clickByText(page, t)) {
      console.log(`[mm] clicked "${t}"`)
      break
    }
  }
  await page.waitForTimeout(2000)
  await snap(page, `mm-import-page-${label}`)

  // PK input — try several selectors
  const pkInput = page
    .locator('#private-key-box, [data-testid="private-key-box"], input[type="password"], textarea')
    .first()
  await pkInput.waitFor({ timeout: 8000 })
  await pkInput.click()
  await pkInput.pressSequentially(pk, { delay: 5 })
  await page.waitForTimeout(500)
  await snap(page, `mm-import-pk-filled-${label}`)

  for (const t of ['Import', 'Confirm', 'Add account', 'Add imported account']) {
    if (await clickByText(page, t)) {
      console.log(`[mm] import button: "${t}"`)
      break
    }
  }
  await page.waitForTimeout(2500)
  console.log(`[mm] imported ${label}`)
}

async function main() {
  console.log('=== PHASE 1: REAL WALLET CONNECTION ===')
  console.log('ext:', EXT_PATH)
  console.log('user-data:', USER_DATA)

  // Wipe userdata for a clean run
  fs.rmSync(USER_DATA, { recursive: true, force: true })

  const context = await chromium.launchPersistentContext(USER_DATA, {
    headless: false,
    args: [
      `--disable-extensions-except=${EXT_PATH}`,
      `--load-extension=${EXT_PATH}`,
      '--disable-blink-features=AutomationControlled',
    ],
    viewport: { width: 1280, height: 800 },
  })

  // MetaMask opens onboarding tab automatically
  const mmPage = await waitForMetaMaskOnboarding(context)
  await onboardMetaMask(mmPage)
  await importAccount(mmPage, GAS_STATION_PK, 'gas-station')
  await snap(mmPage, '05-mm-with-gas-station')
  // Alice import is best-effort — multi-user comes in Phase 3
  try {
    await importAccount(mmPage, ALICE_PK, 'alice')
    await snap(mmPage, '06-mm-with-alice')
  } catch (e) {
    console.log(`[mm] alice import skipped: ${e.message.slice(0, 100)}`)
  }

  // Open the Ori dApp in a new page
  const app = await context.newPage()
  // Capture console errors for diagnosis
  app.on('console', (msg) => {
    if (msg.type() === 'error') console.log(`[app:console] ${msg.text().slice(0, 300)}`)
  })
  app.on('pageerror', (err) => console.log(`[app:pageerror] ${err.message.slice(0, 300)}`))

  console.log(`[app] navigate ${APP_URL}/money`)
  await app.goto(`${APP_URL}/money`, { waitUntil: 'networkidle', timeout: 60_000 }).catch((e) =>
    console.log(`[app] networkidle timeout: ${e.message.slice(0, 100)}`),
  )
  await app.waitForTimeout(8000) // Allow Next.js Turbopack to compile + hydrate
  await snap(app, '07-app-money-disconnected')

  // If we hit "Something went wrong", reload once
  const errText = await app.locator('text=Something went wrong').isVisible({ timeout: 1000 }).catch(() => false)
  if (errText) {
    console.log('[app] saw error page, reloading once')
    await app.reload({ waitUntil: 'networkidle' })
    await app.waitForTimeout(8000)
    await snap(app, '07b-app-after-reload')
  }

  // Click Connect wallet
  const connectBtn = app.locator('button:has-text("Connect wallet")').first()
  await connectBtn.click({ timeout: 15_000 })
  console.log('[app] clicked Connect wallet')
  await app.waitForTimeout(3000)
  await snap(app, '08-app-connect-drawer-open')

  console.log('=== PHASE 1 BASE COMPLETE: drawer captured. Clicking MetaMask. ===')

  // Click "MetaMask" entry in the connect drawer.
  const popupPromise = context.waitForEvent('page', { timeout: 8_000 }).catch(() => null)
  const mmEntry = app.locator('button:has-text("MetaMask")').first()
  await mmEntry.click({ timeout: 8000 })
  console.log('[app] clicked MetaMask in drawer')
  await app.waitForTimeout(2000)
  await snap(app, '09-app-after-mm-click')

  let popup = await popupPromise

  // Fallback: open MM's notification page directly to surface pending request
  if (!popup) {
    console.log('[mm-popup] no popup auto-opened; opening notification.html')
    popup = await context.newPage()
    const extUrl = mmPage.url().split('home.html')[0]
    await popup.goto(`${extUrl}notification.html`, { waitUntil: 'domcontentloaded' })
    await popup.waitForTimeout(2500)
  } else {
    await popup.waitForLoadState('domcontentloaded')
    console.log(`[mm-popup] popup opened: ${popup.url()}`)
  }

  await popup.waitForTimeout(2000)
  await snap(popup, '09-mm-connect-popup')

  // Approve the connection (MetaMask popup may have multi-step: Connect → Confirm)
  for (let i = 0; i < 4; i++) {
    let advanced = false
    for (const t of ['Connect', 'Next', 'Confirm', 'Approve', 'Sign']) {
      if (await clickByText(popup, t)) {
        console.log(`[mm-popup] clicked "${t}"`)
        advanced = true
        await popup.waitForTimeout(2000)
        break
      }
    }
    if (!advanced) break
  }
  await snap(popup, '10-mm-after-connect-approval')
  await app.waitForTimeout(3000)
  await snap(app, '11-app-after-mm-approval')

  // The app may now request a personal_sign for the auth challenge.
  // Watch for new popups and auto-approve.
  context.on('page', async (newPage) => {
    if (newPage === popup || newPage === app) return
    console.log(`[mm-sign] new popup: ${newPage.url()}`)
    await newPage.waitForLoadState('domcontentloaded').catch(() => {})
    await newPage.waitForTimeout(1500)
    await snap(newPage, `12-mm-sign-popup`)
    for (let i = 0; i < 3; i++) {
      let advanced = false
      for (const t of ['Sign', 'Confirm', 'Approve', 'Connect']) {
        if (await clickByText(newPage, t)) {
          console.log(`[mm-sign] clicked "${t}"`)
          advanced = true
          await newPage.waitForTimeout(1500)
          break
        }
      }
      if (!advanced) break
    }
  })

  // Wait up to 30s for the dApp to land in connected state
  await app.waitForTimeout(15_000)
  await snap(app, '13-app-connected')

  // Look for connected indicators in the wallet card area
  const connectedText = await app
    .locator('text=Connect wallet')
    .count()
    .catch(() => 0)
  const addressVisible = await app
    .locator('text=/init1[a-z0-9]+/')
    .first()
    .isVisible({ timeout: 1000 })
    .catch(() => false)
  console.log(
    `[app] connect-wallet button still visible: ${connectedText > 0}; init address visible: ${addressVisible}`,
  )

  console.log('=== PHASE 1 FULL: drawer→MetaMask→connect→sign loop driven ===')
  await app.waitForTimeout(3_000)
  await context.close()
}

main().catch(async (err) => {
  console.error('FAIL:', err.stack || err.message)
  process.exit(1)
})
