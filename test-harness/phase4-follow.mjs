/**
 * Phase 4: Follow a peer via the public-profile page Follow button.
 * Uses follow_graph::follow Move call. Alice → Validator (init1hczz...).
 */
import {
  launchContext, findMmHome, unlockMm, openApp, connectIfNeeded,
  startPopupApprover, clickKitApprove, makeArtDir, snapper, clickByText,
  APP_URL, VALIDATOR_ADDR,
} from './lib/helpers.mjs'

const ART = makeArtDir('p4')
const snap = snapper(ART)

async function main() {
  console.log('=== PHASE 4: FOLLOW (real wallet) ===')
  const context = await launchContext()
  const mm = await findMmHome(context)
  await mm.bringToFront()
  await unlockMm(mm)

  const app = await openApp(context, `${APP_URL}/profile/${VALIDATOR_ADDR}`)
  await snap(app, '01-validator-profile')
  const wasDisconnected = await connectIfNeeded(app, context)
  const approver = startPopupApprover(context, app, 'p4')
  if (wasDisconnected) await app.waitForTimeout(8000)
  await snap(app, '02-validator-connected')

  // Reload profile page to ensure connected state shows the action row
  await app.reload({ waitUntil: 'networkidle' }).catch(() => {})
  await app.waitForTimeout(6000)
  await snap(app, '03-validator-reloaded')

  // Find Follow button
  let clicked = false
  for (const t of ['Follow', 'follow']) {
    if (await clickByText(app, t)) {
      console.log(`[app] clicked "${t}"`)
      clicked = true
      break
    }
  }
  if (!clicked) {
    console.log('[app] WARN no Follow button')
  }
  await app.waitForTimeout(3000)
  await snap(app, '04-after-follow-click')

  await clickKitApprove(app, snap)
  await app.waitForTimeout(20_000).catch(() => {})
  await snap(app, '05-after-broadcast').catch(() => {})

  await approver.stop()
  await context.close().catch(() => {})
  console.log('=== PHASE 4 done ===')
}

main().catch((e) => {
  console.error('FAIL:', e.stack || e.message)
  process.exit(1)
})
