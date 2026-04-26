/**
 * Phase 9: Profile extras — avatar, slug, encryption pubkey, reputation.
 * Each is a separate Move tx through ActionDialog on /profile.
 */
import {
  launchContext, findMmHome, unlockMm, openApp, connectIfNeeded,
  startPopupApprover, clickKitApprove, makeArtDir, snapper, clickByText,
  APP_URL, GAS_STATION_ADDR,
} from './lib/helpers.mjs'

const ART = makeArtDir('p9')
const snap = snapper(ART)

const FLOWS = [
  // [card-text-match, fields-to-fill]
  { name: 'avatar', match: /Update avatar/i, fields: [`https://ex.co/p9-${Date.now()}.png`] },
  { name: 'slug', match: /Set profile slug|set_slug/i, fields: [`alice-p9-${Date.now()}`] },
  // 32-byte hex (sha256 of something) for encryption_pubkey
  { name: 'pubkey', match: /Set encryption pubkey/i, fields: ['11111111111111111111111111111111111111111111111111111111111111aa'] },
  // Reputation thumbs up (alice→gas-station)
  // The thumbs_up flow lives elsewhere — skip for now
]

async function main() {
  console.log('=== PHASE 9: PROFILE EXTRAS ===')
  const context = await launchContext()
  const mm = await findMmHome(context)
  await mm.bringToFront()
  await unlockMm(mm)

  for (const flow of FLOWS) {
    console.log(`\n--- ${flow.name} ---`)
    const app = await openApp(context, `${APP_URL}/profile`)
    await snap(app, `${flow.name}-01-profile`)
    const wasDc = await connectIfNeeded(app, context)
    const approver = startPopupApprover(context, app, `p9-${flow.name}`)
    if (wasDc) await app.waitForTimeout(8000)
    await app.reload({ waitUntil: 'networkidle' }).catch(() => {})
    await app.waitForTimeout(6000)

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
    if (!opened) {
      console.log(`[app] WARN ${flow.name} card not found`)
      await approver.stop()
      await app.close().catch(() => {})
      continue
    }
    await app.waitForTimeout(2000)
    await snap(app, `${flow.name}-02-dialog`)

    // Fill dialog fields
    const dialog = app.locator('form').first()
    const inputs = dialog.locator('input, textarea')
    const n = await inputs.count()
    for (let i = 0; i < Math.min(n, flow.fields.length); i++) {
      await inputs.nth(i).click()
      await inputs.nth(i).press('Control+a').catch(() => {})
      await inputs.nth(i).press('Delete').catch(() => {})
      await inputs.nth(i).pressSequentially(flow.fields[i], { delay: 5 })
    }
    await snap(app, `${flow.name}-03-filled`)

    for (const t of ['Submit action', 'Submit']) {
      if (await clickByText(app, t)) break
    }
    await app.waitForTimeout(3000)

    await clickKitApprove(app, snap)
    await app.waitForTimeout(15_000).catch(() => {})
    await snap(app, `${flow.name}-04-broadcast`)

    await approver.stop()
    await app.close().catch(() => {})
  }

  await context.close().catch(() => {})
  console.log('=== PHASE 9 done ===')
}

main().catch((e) => {
  console.error('FAIL:', e.stack || e.message)
  process.exit(1)
})
