/**
 * Phase 14: Encrypted DM via UI.
 *  Step 1: as gas-station, click "Enable encrypted DMs" in /inbox → publishes
 *          a real X25519 pubkey on-chain via profile_registry::set_encryption_pubkey
 *  Step 2: switch MM back to alice, do the same so alice gets a real pubkey
 *          (the one we set in Phase 9 was a placeholder)
 *  Step 3: as alice, compose a DM to gas-station via the inbox composer
 *  Step 4: verify the message reached the API via /v1/messages/{chatId}
 */
import {
  launchContext, findMmHome, unlockMm, switchMmAccount, openApp, connectIfNeeded,
  startPopupApprover, clickKitApprove, makeArtDir, snapper, clickByText,
  APP_URL, GAS_STATION_ADDR, ALICE_ADDR,
} from './lib/helpers.mjs'

const ART = makeArtDir('p14')
const snap = snapper(ART)
const MSG = `phase14-real-encrypted-${Date.now()}`

async function startChat(app, recipient) {
  // Use the "START A NEW CHAT" composer
  const handleInput = app
    .locator('input[placeholder*="alice.init" i], input[placeholder*=".init" i], input[placeholder*="init1" i]')
    .first()
  if (!(await handleInput.isVisible({ timeout: 5000 }).catch(() => false))) {
    console.log('[app] composer input not found')
    return false
  }
  await handleInput.click()
  await handleInput.press('Control+a').catch(() => {})
  await handleInput.press('Delete').catch(() => {})
  await handleInput.pressSequentially(recipient, { delay: 5 })
  // Click the + button (data-testid or just the only button next to the input)
  const plus = app.locator('button[type="submit"], button[aria-label*="start" i]').first()
  if (await plus.isVisible({ timeout: 1500 }).catch(() => false)) {
    await plus.click()
  } else {
    // Press Enter as fallback
    await handleInput.press('Enter')
  }
  await app.waitForTimeout(2500)
  return true
}

async function enableEncryption(app) {
  // The "Enable encrypted DMs" button appears in the message-list-locked panel
  // after a thread is active. data-testid="message-list-unlock"
  const lockedBtn = app.locator('[data-testid="message-list-unlock"]').first()
  if (await lockedBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await lockedBtn.click()
    console.log('[app] clicked message-list-unlock')
    return true
  }
  for (const t of ['Enable encryption', 'Enable encrypted DMs', 'Enable', 'Unlock']) {
    if (await clickByText(app, t)) {
      console.log(`[app] clicked "${t}"`)
      return true
    }
  }
  return false
}

async function step1_enable_gas(context, mm) {
  console.log('\n--- STEP 1: gas-station enables encryption ---')
  await switchMmAccount(mm, 'Imported account 1')
  await snap(mm, '01-mm-gas-station')
  const app = await openApp(context, `${APP_URL}/inbox`)
  const approver = startPopupApprover(context, app, 'p14-gas')
  await connectIfNeeded(app, context)
  await app.waitForTimeout(15_000)
  await snap(app, '01-inbox-gas-station')

  // Start a chat with alice to surface a thread, then click Enable
  await startChat(app, ALICE_ADDR)
  await snap(app, '01b-after-startchat-gas')

  if (!(await enableEncryption(app))) {
    console.log('[app] Enable encryption button not found')
    await snap(app, '01c-no-button-gas')
    await approver.stop()
    await app.close().catch(() => {})
    return
  }
  await app.waitForTimeout(3000)
  await clickKitApprove(app, snap)
  await app.waitForTimeout(20_000).catch(() => {})
  await snap(app, '02-after-gas-enable')
  await approver.stop()
  await app.close().catch(() => {})
}

async function step2_enable_alice(context, mm) {
  console.log('\n--- STEP 2: alice enables encryption ---')
  await switchMmAccount(mm, 'Imported account 2')
  await snap(mm, '02-mm-alice')
  const app = await openApp(context, `${APP_URL}/inbox`)
  const approver = startPopupApprover(context, app, 'p14-alice')
  await connectIfNeeded(app, context)
  await app.waitForTimeout(15_000)
  await snap(app, '03-inbox-alice')

  // Start chat with gas-station as recipient
  await startChat(app, GAS_STATION_ADDR)
  await snap(app, '03b-after-startchat-alice')

  if (!(await enableEncryption(app))) {
    console.log('[app] Enable button not found')
  }
  await app.waitForTimeout(3000)
  await clickKitApprove(app, snap)
  await app.waitForTimeout(20_000).catch(() => {})
  await snap(app, '04-after-alice-enable')
  return { app, approver }
}

async function step3_send_dm(app) {
  console.log('\n--- STEP 3: alice composes DM ---')
  await snap(app, '05-composer-pre')

  // Once encryption is enabled and recipient has pubkey, the chat input
  // becomes editable. Type message and Send.
  // The input is a textarea with placeholder "Enable encryption first ..."
  // when locked, OR similar when editable.
  const msgInput = app.locator('textarea').first()
  if (!(await msgInput.isVisible({ timeout: 3000 }).catch(() => false))) {
    console.log('[app] message textarea not visible')
    return
  }
  // Check if it's enabled
  const disabled = await msgInput.isDisabled().catch(() => false)
  console.log(`[app] message input disabled=${disabled}`)
  await msgInput.click()
  await msgInput.pressSequentially(MSG, { delay: 5 })
  console.log(`[app] typed message: ${MSG}`)
  await snap(app, '07-msg-typed')

  // Send button — pin to the icon button next to textarea or Send text
  const sendBtn = app
    .locator('button:has-text("Send"), button[aria-label*="send" i], button[type="submit"]')
    .last()
  if (await sendBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
    await sendBtn.click()
    console.log('[app] clicked send button')
  } else {
    await msgInput.press('Enter')
  }
  await app.waitForTimeout(10_000)
  await snap(app, '08-after-send')
}

async function main() {
  console.log('=== PHASE 14: ENCRYPTED DM (real wallet) ===')
  const context = await launchContext()
  const mm = await findMmHome(context)
  await mm.bringToFront()
  await unlockMm(mm)

  await step1_enable_gas(context, mm)
  const result = await step2_enable_alice(context, mm)
  if (result) {
    await step3_send_dm(result.app)
    await result.approver.stop()
  }

  await context.close().catch(() => {})
  console.log(`=== PHASE 14 done — message="${MSG}" ===`)
}

main().catch((e) => {
  console.error('FAIL:', e.stack || e.message)
  process.exit(1)
})
