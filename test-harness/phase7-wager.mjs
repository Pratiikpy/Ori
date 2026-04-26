/**
 * Phase 7: Propose a PvP wager via /play page.
 * wager_escrow::propose_pvp_wager — alice proposes vs gas-station.
 */
import {
  launchContext, findMmHome, unlockMm, openApp, connectIfNeeded,
  startPopupApprover, clickKitApprove, makeArtDir, snapper, clickByText,
  APP_URL, GAS_STATION_ADDR, VALIDATOR_ADDR,
} from './lib/helpers.mjs'

const ART = makeArtDir('p7')
const snap = snapper(ART)
const CLAIM = `phase7-wager-${Date.now()}`

async function main() {
  console.log('=== PHASE 7: WAGER PROPOSE (real wallet) ===')
  const context = await launchContext()
  const mm = await findMmHome(context)
  await mm.bringToFront()
  await unlockMm(mm)

  const app = await openApp(context, `${APP_URL}/play`)
  await snap(app, '01-play')
  const wasDc = await connectIfNeeded(app, context)
  const approver = startPopupApprover(context, app, 'p7')
  if (wasDc) await app.waitForTimeout(8000)
  await app.reload({ waitUntil: 'networkidle' }).catch(() => {})
  await app.waitForTimeout(6000)
  await snap(app, '02-play-connected')

  // Make sure we're on the Wagers tab
  await clickByText(app, 'Wagers')
  await app.waitForTimeout(1500)
  await snap(app, '03-wagers-tab')

  // Find the propose-wager card
  const cards = app.locator('article:has(button:has-text("Open flow"))')
  const cardCount = await cards.count()
  console.log(`[app] ${cardCount} action cards`)
  let opened = false
  for (let i = 0; i < cardCount; i++) {
    const txt = await cards.nth(i).innerText().catch(() => '')
    if (/Propose.*PvP|Propose.*wager/i.test(txt)) {
      await cards.nth(i).locator('button:has-text("Open flow")').click()
      console.log('[app] opened wager propose')
      opened = true
      break
    }
  }
  if (!opened && cardCount > 0) {
    await cards.first().locator('button:has-text("Open flow")').click()
  }
  await app.waitForTimeout(2500)
  await snap(app, '04-wager-dialog')

  // Fill all dialog inputs. The "with third-party arbiter" wager has field
  // order: opponent, arbiter, terms (claim text), stake.
  const dialog = app.locator('form').first()
  const inputs = dialog.locator('input, textarea')
  const n = await inputs.count()
  console.log(`[app] dialog has ${n} fields`)
  const fills = [GAS_STATION_ADDR, VALIDATOR_ADDR, CLAIM, '50000']
  for (let i = 0; i < Math.min(n, fills.length); i++) {
    await inputs.nth(i).click()
    await inputs.nth(i).press('Control+a').catch(() => {})
    await inputs.nth(i).press('Delete').catch(() => {})
    await inputs.nth(i).pressSequentially(fills[i], { delay: 5 })
  }
  console.log(`[app] filled ${Math.min(n, fills.length)} fields`)
  await snap(app, '04b-form-filled')

  for (const t of ['Submit action', 'Submit', 'Propose']) {
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
  console.log(`=== PHASE 7 done — claim=${CLAIM} ===`)
}

main().catch((e) => {
  console.error('FAIL:', e.stack || e.message)
  process.exit(1)
})
