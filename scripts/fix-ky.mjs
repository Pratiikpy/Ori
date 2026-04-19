#!/usr/bin/env node
/**
 * Fix @initia/interwovenkit-react ↔ ky v2 incompatibility.
 *
 * InterwovenKit 2.6.0 calls `ky.create({ prefixUrl })`. ky v2 renamed that
 * option to `prefix` and throws on the old name. We can't downgrade ky (pnpm
 * overrides don't propagate through the whole workspace reliably), so we
 * patch the hoisted ky@2.x in-place: before validateAndMerge runs, translate
 * any `prefixUrl` key on the options source into `prefix`.
 *
 * This file runs as part of the root `postinstall` hook so the patch applies
 * on every fresh install — local dev, CI, and Vercel deploys alike.
 *
 * Idempotent: if the file is already patched, do nothing. Safe to re-run.
 * No failure modes: wrapped in try/catch so a missing file (different ky
 * layout in future versions) doesn't block the install.
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const NEEDLE = 'export const validateAndMerge = (...sources) => {'
const SHIM = [
  'export const validateAndMerge = (...sources) => {',
  '    // ORI_KY_SHIM: translate legacy `prefixUrl` -> `prefix` in place so',
  '    // packages built against ky@1 keep working with ky@2 hoisted.',
  '    for (const s of sources) {',
  '      if (s && Object.prototype.hasOwnProperty.call(s, "prefixUrl") && !("prefix" in s)) {',
  '        s.prefix = s.prefixUrl;',
  '        delete s.prefixUrl;',
  '      }',
  '    }',
].join('\n')
const SHIM_MARKER = 'ORI_KY_SHIM'

function findKyMergeFiles(pnpmDir) {
  if (!existsSync(pnpmDir)) return []
  const out = []
  for (const entry of readdirSync(pnpmDir)) {
    // e.g. ky@2.0.1
    if (!entry.startsWith('ky@2.')) continue
    const p = join(pnpmDir, entry, 'node_modules', 'ky', 'distribution', 'utils', 'merge.js')
    if (existsSync(p)) out.push(p)
  }
  return out
}

function patchFile(file) {
  const src = readFileSync(file, 'utf8')
  if (src.includes(SHIM_MARKER)) return 'already'
  if (!src.includes(NEEDLE)) return 'no-needle'
  writeFileSync(file, src.replace(NEEDLE, SHIM))
  return 'patched'
}

try {
  // pnpm hoists package store to node_modules/.pnpm/<name@version>/...
  // We look for every ky@2.x entry and patch its merge.js.
  const pnpmDir = join(process.cwd(), 'node_modules', '.pnpm')
  const files = findKyMergeFiles(pnpmDir)
  if (files.length === 0) {
    console.log('[fix-ky] no ky@2.x hoisted; nothing to do')
    process.exit(0)
  }
  for (const f of files) {
    const status = patchFile(f)
    console.log(`[fix-ky] ${status} ${f}`)
  }
} catch (err) {
  console.warn('[fix-ky] patch step failed (non-fatal):', err?.message ?? err)
  // Exit 0 anyway — we don't want to break install on a patch failure.
  // If ky is still broken at runtime the error surfaces in the browser.
}
