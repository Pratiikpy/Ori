/**
 * Phase 8: Bulk send via /money Bulk send card.
 * payment_router::batch_send — alice → multiple recipients.
 */
import {
  launchContext, findMmHome, unlockMm, openApp, connectIfNeeded,
  startPopupApprover, clickKitApprove, makeArtDir, snapper, clickByText,
  APP_URL, GAS_STATION_ADDR, PEER_ADDR,
} from './lib/helpers.mjs'

const ART = makeArtDir('p8')
const snap = snapper(ART)

async function main() {
  console.log('=== PHASE 8: BULK SEND (real wallet) ===')
  const context = await launchContext()
  const mm = await findMmHome(context)
  await mm.bringToFront()
  await unlockMm(mm)

  const app = await openApp(context, `${APP_URL}/money`)
  await snap(app, '01-money')
  const wasDc = await connectIfNeeded(app, context)
  const approver = startPopupApprover(context, app, 'p8')
  if (wasDc) await app.waitForTimeout(8000)
  await app.reload({ waitUntil: 'networkidle' }).catch(() => {})
  await app.waitForTimeout(6000)
  await snap(app, '02-money-connected')

  // Click "Open flow" on Bulk send card (second card after Send payment)
  const cards = app.locator('article:has(button:has-text("Open flow"))')
  const cardCount = await cards.count()
  console.log(`[app] ${cardCount} cards`)
  let opened = false
  for (let i = 0; i < cardCount; i++) {
    const txt = await cards.nth(i).innerText().catch(() => '')
    if (/bulk|batch_send|Bulk send/i.test(txt)) {
      await cards.nth(i).locator('button:has-text("Open flow")').click()
      console.log('[app] opened Bulk send')
      opened = true
      break
    }
  }
  if (!opened && cardCount >= 2) {
    await cards.nth(1).locator('button:has-text("Open flow")').click()
  }
  await app.waitForTimeout(2500)
  await snap(app, '03-bulk-dialog')

  // Fill: ActionDialog with fields likely Recipients (CSV) / Amount / Memo / Denom
  const dialog = app.locator('form').first()
  const inputs = dialog.locator('input, textarea')
  const n = await inputs.count()
  console.log(`[app] dialog has ${n} fields`)
  // Bulk send fields: recipientsCSV, total amount, split rule
  const fills = [`${GAS_STATION_ADDR},${PEER_ADDR}`, '100000', 'equal', `p8-bulk-${Date.now()}`]
  for (let i = 0; i < Math.min(n, fills.length); i++) {
    await inputs.nth(i).click()
    await inputs.nth(i).press('Control+a').catch(() => {})
    await inputs.nth(i).press('Delete').catch(() => {})
    await inputs.nth(i).pressSequentially(fills[i], { delay: 5 })
  }
  console.log(`[app] filled ${Math.min(n, fills.length)} fields`)
  await snap(app, '04-form-filled')

  for (const t of ['Submit action', 'Submit', 'Send']) {
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
  console.log('=== PHASE 8 done ===')
}

main().catch((e) => {
  console.error('FAIL:', e.stack || e.message)
  process.exit(1)
})
