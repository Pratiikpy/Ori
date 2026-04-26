/**
 * Reusable helpers for real-wallet UI flow tests.
 *
 * Common pattern across phases:
 *  1. Launch chromium with persisted MetaMask + extension
 *  2. Unlock MetaMask if needed
 *  3. Open dApp page
 *  4. Run a flow-specific driver (form fill + submit)
 *  5. Background popup approver auto-handles MetaMask popups
 *  6. Click Approve in InterwovenKit's confirm drawer
 *  7. Wait for tx broadcast
 *  8. Verify chain state + screenshot
 */
import { chromium } from 'playwright'
import path from 'path'
import fs from 'fs'

export const PASSWORD = 'TestPass123!'
export const APP_URL = process.env.APP_URL ?? 'http://localhost:3000'
export const GAS_STATION_ADDR = 'init1qhwsccy884xexevd29z06ps4hnay8ff6szgkt2'
export const ALICE_ADDR = 'init1m57yx20zrq27r0zk28utrkctp9kdkp7s337sm4'
export const PEER_ADDR = 'init1lv5zyrw6uzp6wf7alucej54sypemlgmjmdmgwu'
export const VALIDATOR_ADDR = 'init1hczz2agguacp2lf5cck4cx0p8ca52hw29gck2a'

export function makeArtDir(name) {
  const dir = path.resolve(`C:/Users/prate/Downloads/Initia builder/ori/test-harness/artifacts-${name}`)
  fs.rmSync(dir, { recursive: true, force: true })
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

export function snapper(art) {
  return async (page, name) => {
    try {
      await page.screenshot({ path: path.join(art, `${name}.png`), fullPage: true })
      console.log(`  📸 ${name}.png`)
    } catch {}
  }
}

export async function clickByText(page, text, timeoutMs = 1500) {
  const sels = [
    `button:has-text("${text}")`,
    `[role="button"]:has-text("${text}")`,
    `text="${text}"`,
  ]
  for (const sel of sels) {
    try {
      const el = page.locator(sel).first()
      if (await el.isVisible({ timeout: timeoutMs }).catch(() => false)) {
        await el.click({ timeout: 5000 })
        return true
      }
    } catch {}
  }
  return false
}

export async function launchContext() {
  const EXT = path.resolve('C:/Users/prate/Downloads/Initia builder/ori/test-harness/metamask-ext')
  const USERDATA = path.resolve('C:/Users/prate/Downloads/Initia builder/ori/test-harness/mm-userdata')
  if (!fs.existsSync(USERDATA)) {
    throw new Error('mm-userdata missing — run phase1-connect.mjs first to onboard MetaMask')
  }
  return chromium.launchPersistentContext(USERDATA, {
    headless: false,
    args: [
      `--disable-extensions-except=${EXT}`,
      `--load-extension=${EXT}`,
      '--disable-blink-features=AutomationControlled',
    ],
    viewport: { width: 1280, height: 800 },
  })
}

export async function findMmHome(context, timeoutMs = 30_000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    for (const p of context.pages()) {
      if (p.url().includes('chrome-extension://') && p.url().includes('home.html')) return p
    }
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error('MetaMask home not found')
}

export async function unlockMm(page) {
  // Wait up to 10s for MM to render either the lock screen or the home UI
  await page.waitForTimeout(2000)
  for (let i = 0; i < 5; i++) {
    const pw = page.locator('input[type="password"]').first()
    if (await pw.isVisible({ timeout: 1500 }).catch(() => false)) {
      await pw.click()
      await pw.pressSequentially(PASSWORD, { delay: 25 })
      for (const t of ['Unlock', 'Submit']) {
        if (await clickByText(page, t)) {
          console.log('[mm] unlocked')
          break
        }
      }
      await page.waitForTimeout(3000)
      return
    }
    await page.waitForTimeout(1500)
  }
  console.log('[mm] no lock screen — already unlocked or still loading')
}

/** Switch the active MetaMask account. `target` matches against any text in
 *  the account list (account label OR truncated address). */
export async function switchMmAccount(page, target) {
  console.log(`[mm-switch] target="${target}"`)
  await page.bringToFront()
  await unlockMm(page)
  // Open account list — the chevron has data-testid="account-menu-icon"
  for (const sel of [
    '[data-testid="account-menu-icon"]',
    '[data-testid="account-options-menu-button"]',
  ]) {
    const el = page.locator(sel).first()
    if (await el.isVisible({ timeout: 2000 }).catch(() => false)) {
      await el.click()
      console.log(`[mm-switch] opened via ${sel}`)
      break
    }
  }
  await page.waitForTimeout(1500)

  // Click on row matching target
  const matchers = [
    `text=${target}`,
    `[data-testid*="account"]:has-text("${target}")`,
    `button:has-text("${target}")`,
  ]
  let switched = false
  for (const m of matchers) {
    const row = page.locator(m).first()
    if (await row.isVisible({ timeout: 1500 }).catch(() => false)) {
      await row.click()
      console.log(`[mm-switch] clicked ${m}`)
      switched = true
      break
    }
  }
  await page.waitForTimeout(2500)
  return switched
}

/** Continuous background popup approver. Returns a `stop()` function. */
export function startPopupApprover(context, app, label = 'bg') {
  let stop = false
  const seen = new Set()
  const promise = (async () => {
    while (!stop) {
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
          console.log(`[${label}] popup ${url.slice(-50)}`)
          try {
            await p.waitForLoadState('domcontentloaded').catch(() => {})
            await p.waitForTimeout(1500)
            const pw = p.locator('input[type="password"]').first()
            if (await pw.isVisible({ timeout: 1500 }).catch(() => false)) {
              await pw.click()
              await pw.pressSequentially(PASSWORD, { delay: 25 })
              for (const t of ['Unlock', 'Submit']) {
                if (await clickByText(p, t)) break
              }
              await p.waitForTimeout(2500)
            }
            for (let i = 0; i < 5; i++) {
              let advanced = false
              for (const t of ['Confirm', 'Sign', 'Approve', 'Connect']) {
                if (await clickByText(p, t)) {
                  console.log(`[${label}] clicked "${t}"`)
                  advanced = true
                  await p.waitForTimeout(1500)
                  break
                }
              }
              if (!advanced) break
            }
          } catch {}
        }
      }
      await new Promise((r) => setTimeout(r, 600))
    }
  })()
  return {
    stop: async () => {
      stop = true
      await promise.catch(() => {})
    },
  }
}

/** Open dApp, recover from any error boundary, optionally clear localStorage. */
export async function openApp(context, url, { clearStorage = true } = {}) {
  const app = await context.newPage()
  app.on('console', (m) => {
    if (m.type() === 'error') {
      const t = m.text()
      if (t.includes('ori:tx-fail') || t.length < 800) console.log(`[app:err] ${t.slice(0, 600)}`)
    }
  })
  app.on('pageerror', (err) => console.log(`[app:pageerror] ${err.message.slice(0, 200)}`))

  if (clearStorage) {
    try {
      await app.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 30_000 })
      await app.evaluate(async () => {
        try {
          localStorage.clear()
          sessionStorage.clear()
          // Also clear IndexedDB so cached encryption keypairs force the
          // "Enable encrypted DMs" path (not the cached-keypair "Unlock"
          // path) on a fresh test run.
          if (indexedDB.databases) {
            const dbs = await indexedDB.databases()
            for (const db of dbs) {
              if (db && db.name) indexedDB.deleteDatabase(db.name)
            }
          }
        } catch {}
      })
    } catch {}
  }
  await app.goto(url, { waitUntil: 'networkidle', timeout: 60_000 }).catch(() => {})
  await app.waitForTimeout(7000)
  if (await app.locator('text=Something went wrong').isVisible({ timeout: 1000 }).catch(() => false)) {
    console.log('[app] reload after error boundary')
    await app.reload({ waitUntil: 'networkidle' })
    await app.waitForTimeout(7000)
  }
  return app
}

/** Connect wallet via the Connect drawer if not already connected. */
export async function connectIfNeeded(app, context) {
  const cv = await app.locator('button:has-text("Connect wallet")').first().isVisible({ timeout: 1500 }).catch(() => false)
  if (!cv) return false
  console.log('[app] connecting via drawer')
  await app.locator('button:has-text("Connect wallet")').first().click()
  await app.waitForTimeout(2000)
  await app.locator('button:has-text("MetaMask")').first().click()
  await app.waitForTimeout(8000)
  return true
}

/** Click "Approve" in the InterwovenKit confirm drawer (polls up to 60s). */
export async function clickKitApprove(app, snap) {
  for (let i = 0; i < 30; i++) {
    if (i % 5 === 0 && snap) await snap(app, `kit-drawer-poll-${i}`)
    const btn = app.getByRole('button', { name: /^Approve$/i }).first()
    if (await btn.isVisible({ timeout: 1500 }).catch(() => false)) {
      await btn.click()
      console.log(`[app] clicked kit Approve (iter ${i})`)
      return true
    }
    await app.waitForTimeout(2000)
  }
  console.log('[app] WARN: kit Approve not found in 60s')
  return false
}

/** Verify a tx hash exists on chain. Returns receipt or null. */
export async function fetchTxReceipt(rpcRest, hash) {
  try {
    const r = await fetch(`${rpcRest}/cosmos/tx/v1beta1/txs/${hash}`)
    if (!r.ok) return null
    return await r.json()
  } catch {
    return null
  }
}

/** Trigger a single cron sync against prod and return result. */
export async function pushCronSync() {
  const SECRET = 'aec640056fed35a21dc118ee2cd55ddf4cf5d2b3a6ca70bd1cbbe882322bae40'
  const r = await fetch('https://ori-chi-rosy.vercel.app/api/v1/cron/sync-events', {
    method: 'POST',
    headers: { 'X-Cron-Secret': SECRET },
  })
  return { status: r.status, body: await r.text() }
}
