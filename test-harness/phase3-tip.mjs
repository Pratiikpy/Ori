/**
 * Phase 3: Tip a creator via UI.
 *
 * Connected as alice (active MM account). Tips gas-station from /money's
 * Tip flow. Form has different shape than /send so this is a separate driver.
 */
import {
  launchContext, findMmHome, unlockMm, openApp, connectIfNeeded,
  startPopupApprover, clickKitApprove, makeArtDir, snapper, clickByText,
  APP_URL, GAS_STATION_ADDR, ALICE_ADDR,
} from './lib/helpers.mjs'

const ART = makeArtDir('p3')
const snap = snapper(ART)

async function main() {
  console.log('=== PHASE 3: TIP A CREATOR (real wallet) ===')
  const context = await launchContext()
  const mm = await findMmHome(context)
  await mm.bringToFront()
  await unlockMm(mm)

  const app = await openApp(context, `${APP_URL}/money`)
  await snap(app, '01-money')
  await connectIfNeeded(app, context)
  // After (re)connect MetaMask injects window.ethereum and a popup may appear
  // for re-auth — start the bg approver immediately.
  const approver = startPopupApprover(context, app, 'p3')
  await app.waitForTimeout(8000)
  await snap(app, '02-money-connected')

  // Click "Open flow" on the "Tip a creator" card. Pinpoint via section text.
  // The Money page Open-flow chain has a hooks bug for the first card; using
  // the legacy /send page is per-flow specific; for tips there's no /tip
  // legacy page — we drive Money's tip card.
  // Strategy: scroll to "Tip a creator" then click the nearest "Open flow".
  const tipCard = app.locator('text=Tip a creator').first()
  await tipCard.scrollIntoViewIfNeeded()
  await app.waitForTimeout(500)
  // Find Open flow button that's after the Tip a creator heading
  // Since DOM ordering matches visual ordering, the THIRD "Open flow" is Tip
  // (Send payment, Bulk send, Tip a creator).
  const openFlows = app.locator('button:has-text("Open flow")')
  const count = await openFlows.count()
  console.log(`[app] ${count} Open flow buttons`)
  if (count >= 3) {
    await openFlows.nth(2).click()
  } else {
    await openFlows.first().click()
  }
  await app.waitForTimeout(3000)
  await snap(app, '03-tip-flow-open')

  // The flow may render an inline form OR a drawer. Look for a recipient
  // field with .init or address placeholder.
  const recipientInput = app.locator('input[placeholder*=".init"], input[placeholder*="address" i], input[name="recipient" i]').first()
  if (await recipientInput.isVisible({ timeout: 5000 }).catch(() => false)) {
    await recipientInput.click()
    await recipientInput.pressSequentially(GAS_STATION_ADDR, { delay: 5 })
    console.log('[app] filled recipient')
  } else {
    console.log('[app] WARN no recipient input found')
  }
  await app.waitForTimeout(800)

  // Amount: try a number input or quick-pick. Tip amounts usually have presets.
  const oneInit = app.locator('button:has-text("1 INIT")').first()
  if (await oneInit.isVisible({ timeout: 1500 }).catch(() => false)) {
    await oneInit.click()
    console.log('[app] selected 1 INIT')
  } else {
    const amt = app.locator('input[type="number"], input[placeholder*="amount" i]').first()
    if (await amt.isVisible({ timeout: 1500 }).catch(() => false)) {
      await amt.click()
      await amt.pressSequentially('0.5', { delay: 30 })
    }
  }
  await app.waitForTimeout(500)

  // Tip message
  const memo = app.locator('input[placeholder*="message" i], input[placeholder*="public" i], textarea').first()
  if (await memo.isVisible({ timeout: 1500 }).catch(() => false)) {
    await memo.click()
    await memo.pressSequentially(`p3-tip-${Date.now()}`, { delay: 5 })
  }
  await snap(app, '04-tip-form-filled')

  // Submit. Tip button might say "Send tip" or "Tip" or "Submit".
  for (const t of ['Send tip', 'Tip', 'Send', 'Submit', 'Confirm']) {
    if (await clickByText(app, t)) {
      console.log(`[app] submitted via "${t}"`)
      break
    }
  }
  await app.waitForTimeout(3000)
  await snap(app, '05-after-submit')

  // Click Approve in the kit drawer
  await clickKitApprove(app, snap)
  await app.waitForTimeout(20_000).catch(() => {})
  await snap(app, '06-after-broadcast').catch(() => {})

  await approver.stop()
  await context.close().catch(() => {})
  console.log('=== PHASE 3 done ===')
}

main().catch((e) => {
  console.error('FAIL:', e.stack || e.message)
  process.exit(1)
})
