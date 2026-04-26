#!/usr/bin/env node
/**
 * Postinstall patches for cosmjs-* packages whose `exports` maps block the
 * subpath imports @initia/interwovenkit-react@2.6.0 makes.
 *
 * Two distinct problems addressed here:
 *
 *  1. cosmjs-types ships:
 *
 *       "exports": {
 *         ".":      { "types": "./index.d.ts" },
 *         "./*":    { "types": "./*.d.ts", "default": "./*.js" },
 *         "./*.js": null
 *       }
 *
 *     The `"./*.js": null` line is a deliberate block on `.js`-suffixed
 *     imports. Webpack/Turbopack honor that block. We replace it with a
 *     real rule that resolves `pkg/foo.js` → `./foo.js` (otherwise the
 *     leftover `./*` pattern would map to `./foo.js.js`).
 *
 *  2. @cosmjs/amino exposes ONLY `.` from its exports map:
 *
 *       "exports": {
 *         "types":   "./build/index.d.ts",
 *         "default": "./build/index.js"
 *       }
 *
 *     But InterwovenKit imports `@cosmjs/amino/build/signdoc.js` directly.
 *     That subpath isn't exposed at all, so resolution fails. We rewrite
 *     the exports map to also expose `./build/*` and `./build/*.js`
 *     subpaths so direct file imports work.
 *
 * Runs from the root postinstall script. Idempotent — safe to re-run.
 */
import { readdir, readFile, writeFile, stat } from 'node:fs/promises'
import path from 'node:path'

const ROOT = process.cwd()

async function findPackageJsons(rootDir, packageName, found = []) {
  let entries
  try {
    entries = await readdir(rootDir, { withFileTypes: true })
  } catch {
    return found
  }
  for (const e of entries) {
    if (!e.isDirectory()) continue
    if (e.name === packageName.split('/')[0]) {
      // matched first segment; descend
      if (packageName.includes('/')) {
        const rest = packageName.split('/').slice(1).join('/')
        const pkgRoot = path.join(rootDir, e.name, rest)
        try {
          await stat(pkgRoot)
          found.push(path.join(pkgRoot, 'package.json'))
        } catch {
          /* not present */
        }
      } else {
        found.push(path.join(rootDir, e.name, 'package.json'))
      }
      continue
    }
    if (
      e.name === 'node_modules' ||
      e.name.startsWith('.pnpm') ||
      e.name.startsWith('@')
    ) {
      await findPackageJsons(path.join(rootDir, e.name), packageName, found)
    } else if (rootDir.endsWith('node_modules') || rootDir.endsWith('.pnpm')) {
      await findPackageJsons(path.join(rootDir, e.name), packageName, found)
    }
  }
  return found
}

async function patchCosmjsTypes(pkgJsonPath) {
  const raw = await readFile(pkgJsonPath, 'utf8')
  const pkg = JSON.parse(raw)
  if (!pkg.exports || typeof pkg.exports !== 'object') return false
  const desiredJsRule = { types: './*.d.ts', default: './*.js' }
  const current = pkg.exports['./*.js']
  const alreadyOk =
    current &&
    typeof current === 'object' &&
    current.default === './*.js'
  if (alreadyOk) return false
  pkg.exports['./*.js'] = desiredJsRule
  await writeFile(pkgJsonPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8')
  return true
}

async function patchCosmjsAmino(pkgJsonPath) {
  const raw = await readFile(pkgJsonPath, 'utf8')
  const pkg = JSON.parse(raw)
  if (!pkg.exports || typeof pkg.exports !== 'object') return false
  // Already-patched form has explicit subpath rules.
  if (pkg.exports['./build/*.js']) return false
  // Preserve the original root-level rule, then add subpath rules so direct
  // imports like `@cosmjs/amino/build/signdoc.js` resolve.
  const root = pkg.exports['.'] ?? {
    types: pkg.exports.types ?? './build/index.d.ts',
    default: pkg.exports.default ?? './build/index.js',
  }
  pkg.exports = {
    '.': root,
    './build/*': { types: './build/*.d.ts', default: './build/*.js' },
    './build/*.js': { types: './build/*.d.ts', default: './build/*.js' },
  }
  await writeFile(pkgJsonPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8')
  return true
}

const cosmjsTypesPaths = await findPackageJsons(
  path.join(ROOT, 'node_modules'),
  'cosmjs-types',
)
const cosmjsAminoPaths = await findPackageJsons(
  path.join(ROOT, 'node_modules'),
  '@cosmjs/amino',
)

let patched = 0
for (const p of cosmjsTypesPaths) {
  if (await patchCosmjsTypes(p)) {
    patched++
    console.log(`patched cosmjs-types: ${path.relative(ROOT, p)}`)
  }
}
for (const p of cosmjsAminoPaths) {
  if (await patchCosmjsAmino(p)) {
    patched++
    console.log(`patched @cosmjs/amino: ${path.relative(ROOT, p)}`)
  }
}
console.log(
  `patch-cosmjs-types: cosmjs-types=${cosmjsTypesPaths.length}, @cosmjs/amino=${cosmjsAminoPaths.length}, patched=${patched}`,
)
