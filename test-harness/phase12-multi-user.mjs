/**
 * Phase 12: TRUE multi-user. Disconnect alice → switch MM → reconnect as
 * gas-station → accept the wager alice proposed in Phase 7 (id 18).
 *
 * Phase 10 attempted this but only switched MM at extension level; the dApp's
 * wagmi session was cached. The fix: trigger Disconnect in the dApp first so
 * wagmi clears, then switch MM, then click Connect again — the connect drawer
 * picks up MM's now-active account.
 */
import {
  launchContext, findMmHome, unlockMm, switchMmAccount, openApp, connectIfNeeded,
  startPopupApprover, clickKitApprove, makeArtDir, snapper, clickByText,
  APP_URL,
} from './lib/helpers.mjs'

const ART = makeArtDir('p12')
const snap = snapper(ART)
const WAGER_ID = '18' // From phase 7

async function main() {
  console.log('=== PHASE 12: MULTI-USER WAGER ACCEPT ===')
  // Fresh chromium context (same persistent userdata so MM is onboarded with
  // both PKs imported) — but we set gas-station as the active account BEFORE
  // opening the dApp, so the first connect uses gas-station from the start.
  const context = await launchContext()
  const mm = await findMmHome(context)
  await mm.bringToFront()
  await unlockMm(mm)
  await snap(mm, 'mm-unlocked')

  // Switch MM to gas-station BEFORE opening dApp
  console.log('[mm] switching to gas-station…')
  const ok =
    (await switchMmAccount(mm, 'Imported account 1')) ||
    (await switchMmAccount(mm, 'Account 4')) ||
    (await switchMmAccount(mm, 'init1qhw'))
  console.log(`[mm] switched=${ok}`)
  await snap(mm, 'mm-switched-gas-station')

  // Open dApp + connect — first-time connect uses MM's now-active account
  const app = await openApp(context, `${APP_URL}/play`)
  const approver = startPopupApprover(context, app, 'p12')
  await connectIfNeeded(app, context)
  await app.waitForTimeout(15_000)
  await snap(app, '04-connected-as-gas-station')

  // Verify by checking the wallet card text
  const walletText = await app.locator('text=/init1[a-z0-9]+/').first().textContent({ timeout: 3000 }).catch(() => '')
  console.log(`[app] wallet shows: ${walletText}`)

  // STEP 4: Navigate to wagers and accept wager id 18
  await app.goto(`${APP_URL}/play`, { waitUntil: 'networkidle' }).catch(() => {})
  await app.waitForTimeout(6000)
  await clickByText(app, 'Wagers')
  await app.waitForTimeout(1500)
  await snap(app, '05-wagers-tab')

  // Find "Accept wager" card
  const cards = app.locator('article:has(button:has-text("Open flow"))')
  const cardCount = await cards.count()
  let opened = false
  for (let i = 0; i < cardCount; i++) {
    const txt = await cards.nth(i).innerText().catch(() => '')
    if (/Accept.*wager|accept_wager/i.test(txt)) {
      await cards.nth(i).locator('button:has-text("Open flow")').click()
      console.log('[app] opened Accept wager')
      opened = true
      break
    }
  }
  if (!opened) console.log('[app] WARN no Accept wager card')
  await app.waitForTimeout(2500)
  await snap(app, '06-accept-dialog')

  // Fill: Wager id
  const dialog = app.locator('form').first()
  const inputs = dialog.locator('input, textarea')
  const n = await inputs.count()
  if (n > 0) {
    await inputs.nth(0).click()
    await inputs.nth(0).pressSequentially(WAGER_ID, { delay: 5 })
  }
  await snap(app, '07-id-filled')

  for (const t of ['Submit action', 'Submit']) {
    if (await clickByText(app, t)) break
  }
  await app.waitForTimeout(3000)
  await clickKitApprove(app, snap)
  await app.waitForTimeout(20_000).catch(() => {})
  await snap(app, '08-after-broadcast').catch(() => {})

  await approver.stop()
  await context.close().catch(() => {})
  console.log('=== PHASE 12 done ===')
}

main().catch((e) => {
  console.error('FAIL:', e.stack || e.message)
  process.exit(1)
})
