/**
 * Phase 14b: As alice, enable encrypted DMs (publishes pubkey) + send a DM
 * to gas-station (whose pubkey was published in 14 step 1).
 *
 * Uses a fresh context-launch so MM is alice from the start; avoids the
 * wagmi-session-sticks issue we saw mid-run.
 */
import {
  findMmHome, unlockMm, openApp, connectIfNeeded,
  startPopupApprover, clickKitApprove, makeArtDir, snapper, clickByText,
  APP_URL, GAS_STATION_ADDR,
} from './lib/helpers.mjs'
import { chromium } from 'playwright'
import path from 'path'

// Use the alice-only MM userdata so wagmi can't get confused by multi-account
// permissions. Onboard via phase1b-onboard-alice-only.mjs first.
const ALICE_USERDATA = path.resolve('C:/Users/prate/Downloads/Initia builder/ori/test-harness/mm-userdata-alice-only')
const EXT = path.resolve('C:/Users/prate/Downloads/Initia builder/ori/test-harness/metamask-ext')

async function launchContextAlice() {
  return chromium.launchPersistentContext(ALICE_USERDATA, {
    headless: false,
    args: [
      `--disable-extensions-except=${EXT}`,
      `--load-extension=${EXT}`,
      '--disable-blink-features=AutomationControlled',
    ],
    viewport: { width: 1280, height: 800 },
  })
}

const ART = makeArtDir('p14b')
const snap = snapper(ART)
const MSG = `phase14b-real-${Date.now()}`

async function main() {
  console.log('=== PHASE 14b: ALICE SENDS ENCRYPTED DM (fresh alice-only MM) ===')
  const context = await launchContextAlice()
  const mm = await findMmHome(context)
  await mm.bringToFront()
  await unlockMm(mm)
  await snap(mm, '00-mm-ready')

  const app = await openApp(context, `${APP_URL}/inbox`)
  const approver = startPopupApprover(context, app, 'p14b')
  await connectIfNeeded(app, context)
  // Long wait — connect → identity-sign → auth-challenge sign chain takes time
  await app.waitForTimeout(30_000)
  await snap(app, '01-inbox-as-alice')

  // If still showing "Connect wallet" button, click again
  const stillDc = await app
    .locator('button:has-text("Connect wallet")').first()
    .isVisible({ timeout: 1500 }).catch(() => false)
  if (stillDc) {
    console.log('[app] still disconnected — retrying connect')
    await connectIfNeeded(app, context)
    await app.waitForTimeout(20_000)
    await snap(app, '01b-after-retry')
  }

  // Verify the connected address is alice
  const connectedAddr = await app
    .locator('text=/init1[a-z0-9]+/').first()
    .textContent({ timeout: 3000 }).catch(() => '')
  console.log(`[app] connected as: ${connectedAddr}`)

  // Start a chat with gas-station
  const handleInput = app
    .locator('input[placeholder*="alice.init" i], input[placeholder*=".init" i], input[placeholder*="init1" i]')
    .first()
  await handleInput.waitFor({ timeout: 8000 })
  await handleInput.click()
  await handleInput.pressSequentially(GAS_STATION_ADDR, { delay: 5 })
  // Click + button next to input
  const plus = handleInput.locator('xpath=ancestor::form//button').first()
  if (await plus.isVisible({ timeout: 1000 }).catch(() => false)) {
    await plus.click()
  } else {
    await handleInput.press('Enter')
  }
  await app.waitForTimeout(3000)
  await snap(app, '02-after-startchat')

  // Click "Enable encrypted DMs" / "Unlock"
  const lockedBtn = app.locator('[data-testid="message-list-unlock"]').first()
  if (await lockedBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await lockedBtn.click()
    console.log('[app] clicked message-list-unlock')
  }
  await app.waitForTimeout(3000)
  await clickKitApprove(app, snap)
  await app.waitForTimeout(20_000).catch(() => {})
  await snap(app, '03-after-enable')

  // Compose and send the message
  const msgInput = app.locator('textarea').first()
  await msgInput.waitFor({ timeout: 8000 }).catch(() => {})
  const disabled = await msgInput.isDisabled().catch(() => null)
  console.log(`[app] message input disabled=${disabled}`)
  if (disabled === false || disabled === null) {
    await msgInput.click()
    await msgInput.pressSequentially(MSG, { delay: 5 })
    console.log(`[app] typed message: ${MSG}`)
    await snap(app, '04-msg-typed')

    // Send button (icon next to textarea)
    const sendBtn = app
      .locator('button[type="submit"], button[aria-label*="send" i]')
      .last()
    if (await sendBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
      await sendBtn.click()
      console.log('[app] clicked send')
    } else {
      await msgInput.press('Enter')
    }
    await app.waitForTimeout(8000)
    await snap(app, '05-after-send')
  } else {
    console.log('[app] message input still disabled — encryption flow may not have completed')
    await snap(app, '04-disabled-state')
  }

  await approver.stop()
  await context.close().catch(() => {})
  console.log(`=== PHASE 14b done — message="${MSG}" ===`)
}

main().catch((e) => {
  console.error('FAIL:', e.stack || e.message)
  process.exit(1)
})
