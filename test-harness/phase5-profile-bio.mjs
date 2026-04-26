/**
 * Phase 5: Update bio via the editable self-profile page (/profile).
 * profile_registry::update_bio Move call.
 */
import {
  launchContext, findMmHome, unlockMm, openApp, connectIfNeeded,
  startPopupApprover, clickKitApprove, makeArtDir, snapper, clickByText,
  APP_URL,
} from './lib/helpers.mjs'

const ART = makeArtDir('p5')
const snap = snapper(ART)
const NEW_BIO = `phase5-real-wallet-${Date.now()}`

async function main() {
  console.log('=== PHASE 5: PROFILE BIO UPDATE (real wallet) ===')
  const context = await launchContext()
  const mm = await findMmHome(context)
  await mm.bringToFront()
  await unlockMm(mm)

  const app = await openApp(context, `${APP_URL}/profile`)
  await snap(app, '01-profile')
  const wasDisconnected = await connectIfNeeded(app, context)
  const approver = startPopupApprover(context, app, 'p5')
  if (wasDisconnected) await app.waitForTimeout(8000)
  await app.reload({ waitUntil: 'networkidle' }).catch(() => {})
  await app.waitForTimeout(6000)
  await snap(app, '02-profile-connected')

  // The /profile page lists action cards. Click "Open flow" inside the
  // "Update bio" card. Each card has heading + Open flow button.
  const cards = app.locator('article:has(button:has-text("Open flow"))')
  const cardCount = await cards.count()
  console.log(`[app] ${cardCount} action cards`)
  let opened = false
  for (let i = 0; i < cardCount; i++) {
    const card = cards.nth(i)
    const text = await card.innerText().catch(() => '')
    if (text.includes('Update bio')) {
      await card.locator('button:has-text("Open flow")').click()
      console.log('[app] opened Update bio flow')
      opened = true
      break
    }
  }
  if (!opened) {
    console.log('[app] WARN no Update bio card found')
  }
  await app.waitForTimeout(2500)
  await snap(app, '03-bio-dialog')

  // Fill the dialog input. ActionDialog uses generic field inputs.
  const bioField = app
    .locator('input[id*="bio"], textarea[id*="bio"], input, textarea')
    .first()
  await bioField.click()
  await bioField.pressSequentially(NEW_BIO, { delay: 5 })
  console.log(`[app] typed bio: ${NEW_BIO}`)
  await snap(app, '03b-bio-typed')

  // Submit ActionDialog
  for (const t of ['Submit action', 'Submit', 'Save']) {
    if (await clickByText(app, t)) {
      console.log(`[app] dialog submit "${t}"`)
      break
    }
  }
  await app.waitForTimeout(3000)
  await snap(app, '04-after-save')

  await clickKitApprove(app, snap)
  await app.waitForTimeout(20_000).catch(() => {})
  await snap(app, '05-after-broadcast').catch(() => {})

  await approver.stop()
  await context.close().catch(() => {})
  console.log(`=== PHASE 5 done — bio=${NEW_BIO} ===`)
}

main().catch((e) => {
  console.error('FAIL:', e.stack || e.message)
  process.exit(1)
})
