/**
 * Phase 10: MULTI-USER — switch MetaMask account from alice to gas-station,
 * then have gas-station purchase alice's paywall (id 15 from Phase 6).
 *
 * Switching accounts in MetaMask emits an `accountsChanged` event that wagmi's
 * useAccount hook listens for; the dApp will see the new address and
 * re-render in connected state for the new wallet.
 */
import {
  launchContext, findMmHome, unlockMm, switchMmAccount, openApp, connectIfNeeded,
  startPopupApprover, clickKitApprove, makeArtDir, snapper, clickByText,
  APP_URL,
} from './lib/helpers.mjs'

const ART = makeArtDir('p10')
const snap = snapper(ART)
const PAYWALL_ID = '15' // From phase 6

// gas-station's address starts with "init1qhw" — match that or
// "Imported account 1" / "Account 4" depending on MM version.
const GAS_STATION_TARGETS = ['init1qhw', 'Account 4', 'Imported account 1']

async function main() {
  console.log('=== PHASE 10: MULTI-USER PAYWALL PURCHASE ===')
  const context = await launchContext()
  const mm = await findMmHome(context)
  await mm.bringToFront()
  await unlockMm(mm)
  await snap(mm, 'mm-unlocked')

  // Switch MM to gas-station BEFORE opening dApp so the connect flow uses it
  let switched = false
  for (const target of GAS_STATION_TARGETS) {
    if (await switchMmAccount(mm, target)) {
      switched = true
      console.log(`[mm] switched to ${target}`)
      break
    }
  }
  if (!switched) console.log('[mm] WARN: could not switch account')
  await snap(mm, 'mm-after-switch')

  const app = await openApp(context, `${APP_URL}/paywall/${PAYWALL_ID}/pay`)
  await snap(app, '01-paywall-page')
  const wasDc = await connectIfNeeded(app, context)
  const approver = startPopupApprover(context, app, 'p10')
  if (wasDc) await app.waitForTimeout(8000)
  await app.reload({ waitUntil: 'networkidle' }).catch(() => {})
  await app.waitForTimeout(7000)
  await snap(app, '02-paywall-connected')

  // Click Purchase / Pay / Buy / Unlock
  let clicked = false
  for (const t of ['Purchase', 'Buy', 'Pay', 'Unlock', 'Pay paywall']) {
    if (await clickByText(app, t)) {
      console.log(`[app] clicked "${t}"`)
      clicked = true
      break
    }
  }
  if (!clicked) console.log('[app] WARN no purchase button')
  await app.waitForTimeout(3000)
  await snap(app, '03-after-purchase-click')

  await clickKitApprove(app, snap)
  await app.waitForTimeout(20_000).catch(() => {})
  await snap(app, '04-after-broadcast').catch(() => {})

  await approver.stop()
  await context.close().catch(() => {})
  console.log(`=== PHASE 10 done — paywall ${PAYWALL_ID} ===`)
}

main().catch((e) => {
  console.error('FAIL:', e.stack || e.message)
  process.exit(1)
})
