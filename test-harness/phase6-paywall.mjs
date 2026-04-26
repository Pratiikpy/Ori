/**
 * Phase 6: Paywall create via /money page Paywalls tab → ActionDialog.
 */
import {
  launchContext, findMmHome, unlockMm, openApp, connectIfNeeded,
  startPopupApprover, clickKitApprove, makeArtDir, snapper, clickByText,
  APP_URL,
} from './lib/helpers.mjs'

const ART = makeArtDir('p6')
const snap = snapper(ART)
const TITLE = `phase6-real-${Date.now()}`

async function main() {
  console.log('=== PHASE 6: PAYWALL CREATE (real wallet) ===')
  const context = await launchContext()
  const mm = await findMmHome(context)
  await mm.bringToFront()
  await unlockMm(mm)

  const app = await openApp(context, `${APP_URL}/money`)
  await snap(app, '01-money')
  const wasDc = await connectIfNeeded(app, context)
  const approver = startPopupApprover(context, app, 'p6')
  if (wasDc) await app.waitForTimeout(8000)
  await app.reload({ waitUntil: 'networkidle' }).catch(() => {})
  await app.waitForTimeout(6000)
  await snap(app, '02-money-connected')

  // Click "Paywalls" tab
  await clickByText(app, 'Paywalls')
  await app.waitForTimeout(1500)
  await snap(app, '03-paywalls-tab')

  // Find a card whose text mentions creating a paywall
  const cards = app.locator('article:has(button:has-text("Open flow"))')
  const cardCount = await cards.count()
  console.log(`[app] ${cardCount} cards on paywalls tab`)
  let opened = false
  for (let i = 0; i < cardCount; i++) {
    const txt = await cards.nth(i).innerText().catch(() => '')
    if (/Create paywall|create_paywall/i.test(txt)) {
      await cards.nth(i).locator('button:has-text("Open flow")').click()
      console.log('[app] opened Create paywall flow')
      opened = true
      break
    }
  }
  if (!opened && cardCount > 0) {
    // fall back to first card
    await cards.first().locator('button:has-text("Open flow")').click()
  }
  await app.waitForTimeout(2500)
  await snap(app, '04-create-dialog')

  // The dialog has Title / Price / Content URI fields. Fill all three.
  const dialog = app.locator('[data-testid="form-create_paywall"], form').first()
  const inputs = dialog.locator('input, textarea')
  const n = await inputs.count()
  console.log(`[app] dialog has ${n} fields`)
  if (n > 0) {
    await inputs.nth(0).click()
    await inputs.nth(0).pressSequentially(TITLE, { delay: 5 })
  }
  if (n > 1) {
    await inputs.nth(1).click()
    await inputs.nth(1).pressSequentially('100000', { delay: 5 })
  }
  if (n > 2) {
    await inputs.nth(2).click()
    await inputs.nth(2).pressSequentially('ipfs://bafy-real-paywall', { delay: 5 })
  }
  console.log('[app] filled paywall fields')
  await app.waitForTimeout(500)
  await snap(app, '04b-form-filled')

  // Submit
  for (const t of ['Submit action', 'Submit', 'Create']) {
    if (await clickByText(app, t)) {
      console.log(`[app] dialog submit "${t}"`)
      break
    }
  }
  await app.waitForTimeout(3000)
  await snap(app, '05-after-submit')

  await clickKitApprove(app, snap)
  await app.waitForTimeout(20_000).catch(() => {})
  await snap(app, '06-after-broadcast').catch(() => {})

  await approver.stop()
  await context.close().catch(() => {})
  console.log(`=== PHASE 6 done — title=${TITLE} ===`)
}

main().catch((e) => {
  console.error('FAIL:', e.stack || e.message)
  process.exit(1)
})
