/**
 * Phase 11: Play extras — create lucky pool + create prediction market.
 * Both are single-user create flows on /play.
 */
import {
  launchContext, findMmHome, unlockMm, openApp, connectIfNeeded,
  startPopupApprover, clickKitApprove, makeArtDir, snapper, clickByText,
  APP_URL,
} from './lib/helpers.mjs'

const ART = makeArtDir('p11')
const snap = snapper(ART)

const FLOWS = [
  {
    name: 'lucky-pool',
    tab: 'Lucky pools',
    match: /Create.*pool|create_pool/i,
    fields: ['25000', '3'], // entry fee, max participants
  },
  {
    name: 'prediction-market',
    tab: 'Prediction markets',
    match: /Create market|create_market/i,
    // pair, target_price, comparator (true), deadline_seconds (300)
    fields: ['BTC/USD', '7482442977', 'true', '300'],
  },
]

async function main() {
  console.log('=== PHASE 11: PLAY EXTRAS ===')
  const context = await launchContext()
  const mm = await findMmHome(context)
  await mm.bringToFront()
  await unlockMm(mm)

  for (const flow of FLOWS) {
    console.log(`\n--- ${flow.name} ---`)
    const app = await openApp(context, `${APP_URL}/play`)
    await snap(app, `${flow.name}-01-play`)
    const wasDc = await connectIfNeeded(app, context)
    const approver = startPopupApprover(context, app, `p11-${flow.name}`)
    if (wasDc) await app.waitForTimeout(8000)
    await app.reload({ waitUntil: 'networkidle' }).catch(() => {})
    await app.waitForTimeout(6000)

    // Click the tab
    await clickByText(app, flow.tab)
    await app.waitForTimeout(1500)
    await snap(app, `${flow.name}-02-tab`)

    const cards = app.locator('article:has(button:has-text("Open flow"))')
    const cardCount = await cards.count()
    console.log(`[app] ${cardCount} cards`)
    let opened = false
    for (let i = 0; i < cardCount; i++) {
      const txt = await cards.nth(i).innerText().catch(() => '')
      if (flow.match.test(txt)) {
        await cards.nth(i).locator('button:has-text("Open flow")').click()
        console.log(`[app] opened ${flow.name}`)
        opened = true
        break
      }
    }
    if (!opened && cardCount > 0) {
      await cards.first().locator('button:has-text("Open flow")').click()
    }
    await app.waitForTimeout(2500)
    await snap(app, `${flow.name}-03-dialog`)

    const dialog = app.locator('form').first()
    const inputs = dialog.locator('input, textarea')
    const n = await inputs.count()
    console.log(`[app] ${n} fields`)
    for (let i = 0; i < Math.min(n, flow.fields.length); i++) {
      await inputs.nth(i).click()
      await inputs.nth(i).press('Control+a').catch(() => {})
      await inputs.nth(i).press('Delete').catch(() => {})
      await inputs.nth(i).pressSequentially(flow.fields[i], { delay: 5 })
    }
    await snap(app, `${flow.name}-04-filled`)

    for (const t of ['Submit action', 'Submit']) {
      if (await clickByText(app, t)) break
    }
    await app.waitForTimeout(3000)

    await clickKitApprove(app, snap)
    await app.waitForTimeout(15_000).catch(() => {})
    await snap(app, `${flow.name}-05-broadcast`)

    await approver.stop()
    await app.close().catch(() => {})
  }

  await context.close().catch(() => {})
  console.log('=== PHASE 11 done ===')
}

main().catch((e) => {
  console.error('FAIL:', e.stack || e.message)
  process.exit(1)
})
