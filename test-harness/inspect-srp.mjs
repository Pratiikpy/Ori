/**
 * Diagnostic: navigate MetaMask to the SRP entry page, dump every input
 * element's data-testid + name + placeholder so we know the right selectors.
 */
import { chromium } from 'playwright'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const EXT_PATH = path.resolve(__dirname, 'metamask-ext')
const USER_DATA = path.resolve(__dirname, 'mm-userdata-inspect')
const ART = path.resolve(__dirname, 'artifacts')
fs.rmSync(USER_DATA, { recursive: true, force: true })

async function clickByText(page, text) {
  const sel = `text="${text}"`
  try {
    const el = page.locator(sel).first()
    if (await el.isVisible({ timeout: 2000 })) {
      await el.click()
      return true
    }
  } catch {}
  // try button/role
  try {
    const el = page.getByRole('button', { name: text }).first()
    if (await el.isVisible({ timeout: 2000 })) {
      await el.click()
      return true
    }
  } catch {}
  return false
}

const ctx = await chromium.launchPersistentContext(USER_DATA, {
  headless: false,
  args: [`--disable-extensions-except=${EXT_PATH}`, `--load-extension=${EXT_PATH}`],
  viewport: { width: 1280, height: 800 },
})

// Wait for MetaMask onboarding tab
let mm = null
for (let i = 0; i < 60; i++) {
  for (const p of ctx.pages()) {
    if (p.url().includes('chrome-extension://') && p.url().includes('home.html')) {
      mm = p
      break
    }
  }
  if (mm) break
  await new Promise((r) => setTimeout(r, 500))
}
if (!mm) throw new Error('mm tab not found')

await mm.bringToFront()
await mm.waitForLoadState('domcontentloaded')
await mm.waitForTimeout(3000)

console.log('Page 1 (welcome) URL:', mm.url())
await clickByText(mm, 'I have an existing wallet')
await mm.waitForTimeout(2500)

console.log('Page 2 (auth) URL:', mm.url())
await clickByText(mm, 'Import using Secret Recovery Phrase')
await mm.waitForTimeout(3000)

console.log('Page 3 (SRP entry) URL:', mm.url())
await mm.screenshot({ path: path.join(ART, 'inspect-srp-page.png'), fullPage: true })

const all = await mm.evaluate(() => {
  const inputs = Array.from(document.querySelectorAll('input'))
  return inputs.map((el, i) => ({
    idx: i,
    type: el.type,
    name: el.name,
    id: el.id,
    placeholder: el.placeholder,
    testId: el.getAttribute('data-testid'),
    visible: el.offsetParent !== null,
  }))
})
console.log('INPUTS:')
console.log(JSON.stringify(all, null, 2))

const buttons = await mm.evaluate(() => {
  const btns = Array.from(document.querySelectorAll('button'))
  return btns.map((el, i) => ({
    idx: i,
    text: el.innerText.slice(0, 40),
    testId: el.getAttribute('data-testid'),
    disabled: el.disabled,
    visible: el.offsetParent !== null,
  }))
})
console.log('BUTTONS:')
console.log(JSON.stringify(buttons, null, 2))

await mm.waitForTimeout(2000)
await ctx.close()
