#!/usr/bin/env node
/**
 * libsodium-wrappers-sumo@0.7.x ships a broken ESM entry: the wrapper
 * `dist/modules-sumo-esm/libsodium-wrappers.mjs` imports a relative path
 * `./libsodium-sumo.mjs` that doesn't exist in the wrapper's own package.
 * The sumo core lives in the sibling `libsodium-sumo` package.
 *
 * Turbopack (Next 16) refuses to walk that relative import out to the
 * other package. Rather than patch upstream, we copy the sumo .mjs into
 * the expected path on postinstall. Idempotent, safe to re-run.
 *
 * Upstream issue: https://github.com/jedisct1/libsodium.js
 */
import { existsSync, copyFileSync, mkdirSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

function findAllWrappers(root) {
  // Walk node_modules/.pnpm and find every installed version of
  // libsodium-wrappers-sumo alongside its peer libsodium-sumo. This works
  // regardless of pnpm hoisting, Windows quirks, or duplicate versions.
  const hits = []
  const pnpmDir = join(root, 'node_modules', '.pnpm')
  if (!existsSync(pnpmDir)) return hits
  for (const entry of readdirSync(pnpmDir)) {
    if (!entry.startsWith('libsodium-wrappers-sumo@')) continue
    const wrapper = join(pnpmDir, entry, 'node_modules', 'libsodium-wrappers-sumo')
    const sumo = join(pnpmDir, entry, 'node_modules', 'libsodium-sumo')
    if (existsSync(wrapper) && existsSync(sumo)) hits.push({ wrapper, sumo })
  }
  return hits
}

try {
  let patched = 0
  for (const { wrapper, sumo } of findAllWrappers(process.cwd())) {
    const src = join(sumo, 'dist', 'modules-sumo-esm', 'libsodium-sumo.mjs')
    const dstDir = join(wrapper, 'dist', 'modules-sumo-esm')
    const dst = join(dstDir, 'libsodium-sumo.mjs')
    if (!existsSync(src) || existsSync(dst)) continue
    mkdirSync(dstDir, { recursive: true })
    copyFileSync(src, dst)
    patched++
    console.log(`[fix-libsodium] patched ${dst}`)
  }
  if (patched === 0) {
    console.log('[fix-libsodium] nothing to patch (already fixed or not installed)')
  }
} catch (err) {
  // Surface the error but don't fail postinstall — an explicit build break
  // downstream is a clearer signal than a silent install failure.
  console.warn('[fix-libsodium] skipped:', err instanceof Error ? err.message : err)
}
