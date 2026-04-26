/**
 * Phase 13: Reverse-direction tip — gas-station tips alice via UI.
 * Proves the multi-user round-trip: alice → gas-station (Phase 3) AND
 * gas-station → alice (this phase).
 */
import {
  launchContext, findMmHome, unlockMm, switchMmAccount, openApp, connectIfNeeded,
  startPopupApprover, clickKitApprove, makeArtDir, snapper, clickByText,
  APP_URL, ALICE_ADDR,
} from './lib/helpers.mjs'

const ART = makeArtDir('p13')
const snap = snapper(ART)

async function main() {
  console.log('=== PHASE 13: REVERSE-DIRECTION TIP (gas-station → alice) ===')
  const context = await launchContext()
  const mm = await findMmHome(context)
  await mm.bringToFront()
  await unlockMm(mm)
  await switchMmAccount(mm, 'Imported account 1')
  await snap(mm, 'mm-as-gas-station')

  const app = await openApp(context, `${APP_URL}/money`)
  const approver = startPopupApprover(context, app, 'p13')
  await connectIfNeeded(app, context)
  await app.waitForTimeout(15_000)
  await snap(app, '01-money-as-gas-station')

  // Click "Open flow" on Tip card (3rd card)
  const cards = app.locator('article:has(button:has-text("Open flow"))')
  const cardCount = await cards.count()
  let opened = false
  for (let i = 0; i < cardCount; i++) {
    const txt = await cards.nth(i).innerText().catch(() => '')
    if (/Tip a creator/i.test(txt)) {
      await cards.nth(i).locator('button:has-text("Open flow")').click()
      opened = true
      console.log('[app] opened Tip')
      break
    }
  }
  await app.waitForTimeout(2500)
  await snap(app, '02-tip-dialog')

  // Fill: creator (alice), amount, message
  const dialog = app.locator('form').first()
  const inputs = dialog.locator('input, textarea')
  const n = await inputs.count()
  console.log(`[app] ${n} fields`)
  const fills = [ALICE_ADDR, '300000', `p13-reverse-${Date.now()}`]
  for (let i = 0; i < Math.min(n, fills.length); i++) {
    await inputs.nth(i).click()
    await inputs.nth(i).press('Control+a').catch(() => {})
    await inputs.nth(i).press('Delete').catch(() => {})
    await inputs.nth(i).pressSequentially(fills[i], { delay: 5 })
  }
  await snap(app, '03-filled')

  for (const t of ['Submit action', 'Submit']) {
    if (await clickByText(app, t)) break
  }
  await app.waitForTimeout(3000)
  await clickKitApprove(app, snap)
  await app.waitForTimeout(20_000).catch(() => {})
  await snap(app, '04-after-broadcast').catch(() => {})

  await approver.stop()
  await context.close().catch(() => {})
  console.log('=== PHASE 13 done ===')
}

main().catch((e) => {
  console.error('FAIL:', e.stack || e.message)
  process.exit(1)
})
