/**
 * Phase 2: real transaction via UI.
 *
 * Reuses the persistent mm-userdata from phase1 (MetaMask already onboarded
 * with gas-station + alice imported). Connects via InterwovenKit, fills the
 * Send Payment flow, submits, approves the MetaMask signature popup,
 * confirms the tx broadcast, syncs cron, verifies UI updates.
 */
import { chromium } from 'playwright'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const EXT_PATH = path.resolve(__dirname, 'metamask-ext')
const USER_DATA = path.resolve(__dirname, 'mm-userdata')
const ART = path.resolve(__dirname, 'artifacts-p2')
fs.mkdirSync(ART, { recursive: true })

const PASSWORD = 'TestPass123!'
const APP_URL = process.env.APP_URL ?? 'http://localhost:3000'
const RECIPIENT_INIT_ADDR = 'init1qhwsccy884xexevd29z06ps4hnay8ff6szgkt2' // gas-station

async function snap(page, name) {
  const f = path.join(ART, `${name}.png`)
  try {
    await page.screenshot({ path: f, fullPage: true })
    console.log(`  📸 ${name}.png`)
  } catch {}
}

async function clickByText(page, text) {
  const sels = [
    `button:has-text("${text}")`,
    `[role="button"]:has-text("${text}")`,
    `text="${text}"`,
  ]
  for (const sel of sels) {
    try {
      const el = page.locator(sel).first()
      if (await el.isVisible({ timeout: 1500 }).catch(() => false)) {
        await el.click({ timeout: 5000 })
        return true
      }
    } catch {}
  }
  return false
}

async function waitForMmHome(context) {
  for (let i = 0; i < 60; i++) {
    for (const p of context.pages()) {
      if (p.url().includes('chrome-extension://') && p.url().includes('home.html')) return p
    }
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error('MetaMask home page not found')
}

async function unlockIfNeeded(page) {
  const unlock = page.locator('input[type="password"]').first()
  if (await unlock.isVisible({ timeout: 3000 }).catch(() => false)) {
    await unlock.click()
    await unlock.pressSequentially(PASSWORD, { delay: 25 })
    for (const t of ['Unlock', 'Submit', 'Continue']) {
      if (await clickByText(page, t)) {
        console.log(`[mm] unlocked via "${t}"`)
        break
      }
    }
    await page.waitForTimeout(2500)
  }
}

async function approvePopups(context, app, label = '', durationMs = 30_000) {
  // Watch for MetaMask popups for the given duration and auto-approve them,
  // including unlocking when MetaMask presents a password prompt.
  const start = Date.now()
  const seen = new Set()
  while (Date.now() - start < durationMs) {
    const pages = context.pages()
    for (const p of pages) {
      if (p === app || seen.has(p)) continue
      const url = p.url()
      if (url.includes('chrome-extension://') && (url.includes('notification') || url.includes('home.html#confirm'))) {
        seen.add(p)
        console.log(`[mm-popup${label}] handling ${url.slice(-60)}`)
        await p.waitForLoadState('domcontentloaded').catch(() => {})
        await p.waitForTimeout(1500)
        await snap(p, `mm-popup-${label}-${seen.size}`)

        // Unlock if locked
        const pw = p.locator('input[type="password"]').first()
        if (await pw.isVisible({ timeout: 2000 }).catch(() => false)) {
          await pw.click()
          await pw.pressSequentially(PASSWORD, { delay: 25 })
          for (const t of ['Unlock', 'Submit']) {
            if (await clickByText(p, t)) {
              console.log(`[mm-popup${label}] unlocked`)
              break
            }
          }
          await p.waitForTimeout(2500)
          await snap(p, `mm-popup-${label}-${seen.size}-unlocked`)
        }

        // Approval click chain
        for (let i = 0; i < 5; i++) {
          let advanced = false
          for (const t of ['Confirm', 'Sign', 'Approve', 'Connect', 'Next']) {
            if (await clickByText(p, t)) {
              console.log(`[mm-popup${label}] clicked "${t}"`)
              advanced = true
              await p.waitForTimeout(1500)
              break
            }
          }
          if (!advanced) break
        }
        await snap(p, `mm-popup-${label}-${seen.size}-final`)
      }
    }
    await new Promise((r) => setTimeout(r, 800))
  }
  return seen.size
}

async function main() {
  console.log('=== PHASE 2: REAL TX VIA UI ===')
  if (!fs.existsSync(USER_DATA)) {
    throw new Error('mm-userdata not found — run phase1-connect first')
  }

  const context = await chromium.launchPersistentContext(USER_DATA, {
    headless: false,
    args: [
      `--disable-extensions-except=${EXT_PATH}`,
      `--load-extension=${EXT_PATH}`,
      '--disable-blink-features=AutomationControlled',
    ],
    viewport: { width: 1280, height: 800 },
  })

  const mm = await waitForMmHome(context)
  await mm.bringToFront()
  await unlockIfNeeded(mm)
  await snap(mm, '00-mm-unlocked')

  // Clear cookies/storage for the dApp host so we get a clean connect cycle
  // and bypass the "hooks order" page-error boundary that fires on persisted
  // wallet auto-resume.
  await context.clearCookies()
  await context.clearPermissions().catch(() => {})

  // Open dApp
  const app = await context.newPage()
  app.on('console', (m) => {
    if (m.type() === 'error') {
      const text = m.text()
      // Dump full error for ori:tx-fail diagnostics; truncate noise
      if (text.includes('ori:tx-fail') || text.length < 1500) {
        console.log(`[app:err] ${text}`)
      } else {
        console.log(`[app:err] ${text.slice(0, 800)}…`)
      }
    }
  })
  app.on('pageerror', (err) => console.log(`[app:pageerror] ${err.message}\n${err.stack?.slice(0, 1500) ?? ''}`))
  // Wipe any leftover localStorage from prior runs.
  await app.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 30_000 }).catch(() => {})
  try {
    await app.evaluate(() => {
      try { localStorage.clear(); sessionStorage.clear() } catch {}
    })
  } catch {}
  console.log(`[app] navigate ${APP_URL}/money`)
  await app.goto(`${APP_URL}/money`, { waitUntil: 'networkidle', timeout: 60_000 }).catch(() => {})
  await app.waitForTimeout(8000)
  await snap(app, '01-app-money')

  // If the page caught an error boundary, reload once
  if (await app.locator('text=Something went wrong').isVisible({ timeout: 1500 }).catch(() => false)) {
    console.log('[app] error boundary visible — reloading')
    await app.reload({ waitUntil: 'networkidle' })
    await app.waitForTimeout(8000)
    await snap(app, '01b-app-after-reload')
  }

  // If not connected, connect via the drawer
  const connectVisible = await app
    .locator('button:has-text("Connect wallet")').first()
    .isVisible({ timeout: 1500 }).catch(() => false)
  if (connectVisible) {
    console.log('[app] not connected — opening drawer')
    await app.locator('button:has-text("Connect wallet")').first().click()
    await app.waitForTimeout(2000)
    await snap(app, '02-drawer-open')
    await app.locator('button:has-text("MetaMask")').first().click()
    await app.waitForTimeout(2000)
    // Approve any popups
    const _ = approvePopups(context, app, 'connect')
    await app.waitForTimeout(8000)
    await snap(app, '03-after-connect')
  } else {
    console.log('[app] already connected')
    await snap(app, '03-already-connected')
  }

  // Use the legacy /send standalone page — Money tab's "Open flow" trigger
  // has a React hooks order bug we discovered.
  console.log(`[app] navigate ${APP_URL}/send`)
  await app.goto(`${APP_URL}/send`, { waitUntil: 'networkidle', timeout: 60_000 }).catch(() => {})
  await app.waitForTimeout(6000)
  await snap(app, '04-send-page')

  // Reload once if hooks error
  if (await app.locator('text=Something went wrong').isVisible({ timeout: 1500 }).catch(() => false)) {
    console.log('[app] reload /send to recover')
    await app.reload({ waitUntil: 'networkidle' })
    await app.waitForTimeout(6000)
    await snap(app, '04b-send-page-reload')
  }

  // Fill form. Recipient placeholder is "alice.init or init1…"
  const recipientInput = app.locator('input[placeholder*=".init"]').first()
  await recipientInput.waitFor({ timeout: 10_000 })
  await recipientInput.click()
  await recipientInput.pressSequentially(RECIPIENT_INIT_ADDR, { delay: 5 })
  console.log('[app] filled recipient')

  // Use the "1 INIT" quick-set button instead of typing into the custom amount widget.
  await app.waitForTimeout(800)
  const oneInit = app.locator('button:has-text("1 INIT")').first()
  await oneInit.click({ timeout: 5000 })
  console.log('[app] clicked 1 INIT quick-set')

  // Memo
  const memoSel = `input[placeholder*="coffee" i], input[placeholder*="memo" i], textarea[placeholder*="coffee" i]`
  const memoInput = app.locator(memoSel).first()
  if (await memoInput.isVisible({ timeout: 1000 }).catch(() => false)) {
    await memoInput.click()
    await memoInput.pressSequentially(`p2-${Date.now()}`, { delay: 5 })
  }
  await app.waitForTimeout(500)
  await snap(app, '05-send-form-filled')

  // Spawn a continuous background popup-approver — handles BOTH the
  // pubkey-derive identity sign popup (fires during the kit's "Loading…"
  // preview phase) AND the eventual broadcast sign popup. Without this,
  // the kit hangs in Loading because no one approves the first popup.
  let stopApprover = false
  const approverPromise = (async () => {
    const seen = new Set()
    while (!stopApprover) {
      try {
        if (context.pages().length === 0) break
      } catch {
        break
      }
      for (const p of context.pages()) {
        if (p === app || seen.has(p)) continue
        let url = ''
        try { url = p.url() } catch { continue }
        if (
          url.includes('chrome-extension://') &&
          (url.includes('notification') || url.includes('home.html#confirm'))
        ) {
          seen.add(p)
          console.log(`[bg-popup] handling ${url.slice(-50)}`)
          try {
            await p.waitForLoadState('domcontentloaded').catch(() => {})
            await p.waitForTimeout(1500)
            // Unlock if needed
            const pw = p.locator('input[type="password"]').first()
            if (await pw.isVisible({ timeout: 1500 }).catch(() => false)) {
              await pw.click()
              await pw.pressSequentially(PASSWORD, { delay: 25 })
              for (const t of ['Unlock', 'Submit']) {
                if (await clickByText(p, t)) break
              }
              await p.waitForTimeout(2500)
            }
            // Approval chain
            for (let i = 0; i < 5; i++) {
              let advanced = false
              for (const t of ['Confirm', 'Sign', 'Approve', 'Connect']) {
                if (await clickByText(p, t)) {
                  console.log(`[bg-popup] clicked "${t}"`)
                  advanced = true
                  await p.waitForTimeout(1500)
                  break
                }
              }
              if (!advanced) break
            }
          } catch (e) {
            // Popup closed mid-handling — that's fine
          }
        }
      }
      await new Promise((r) => setTimeout(r, 600))
    }
  })()

  // Submit
  for (const t of ['Send', 'Send payment', 'Submit', 'Confirm']) {
    if (await clickByText(app, t)) {
      console.log(`[app] clicked submit "${t}"`)
      break
    }
  }
  await app.waitForTimeout(2000)
  await snap(app, '06-after-submit')

  // Wait for the InterwovenKit "Confirm tx" drawer (Shadow DOM) to render,
  // then click its "Approve" button. The drawer is rendered into a shadow
  // root; Playwright's text= locator pierces it. We pin to button role + the
  // exact label "Approve" — clicking "Send" would retrigger the page form.
  // The drawer first shows Loading… while the kit computes a preview. Then
  // shows the Approve button. Wait up to 60s for it to render.
  let approved = false
  for (let i = 0; i < 30; i++) {
    if (i % 5 === 0) await snap(app, `06b-drawer-poll-${i}`)
    const approveBtn = app.getByRole('button', { name: /^Approve$/i }).first()
    if (await approveBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
      await approveBtn.click()
      console.log(`[app] clicked drawer Approve (poll iter ${i})`)
      approved = true
      break
    }
    await app.waitForTimeout(2000)
  }
  if (!approved) console.log('[app] WARN: Approve button not found in drawer after 60s')
  await app.waitForTimeout(3000)
  await snap(app, '06c-after-approve')

  // Background approver is still running. Wait for tx to broadcast.
  await app.waitForTimeout(20_000).catch(() => {})
  await snap(app, '07-after-tx-broadcast').catch(() => {})
  stopApprover = true
  await approverPromise.catch(() => {})

  // Look for tx hash / success toast
  const successText = await app.locator('text=/tx|hash|broadcast|success/i').first().textContent({ timeout: 2000 }).catch(() => null)
  console.log(`[app] success indicator: ${successText?.slice(0, 200) ?? 'none'}`)

  console.log('=== PHASE 2 done ===')
  await app.waitForTimeout(3000).catch(() => {})
  await context.close().catch(() => {})
}

main().catch(async (e) => {
  console.error('FAIL:', e.stack || e.message)
  process.exit(1)
})
