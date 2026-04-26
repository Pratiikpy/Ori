// Postprocess transform: convert
//   await sendOne(<msg>) ; toast.success(<args>)
// into
//   const __r = await sendOne(<msg>) ; toastTx(<args>, __r)
// so every successful broadcast surfaces the tx hash + explorer link.
//
// Why a script and not 30+ Edits: the call sites are mechanical but the
// msg builder calls span multiple lines with embedded template literals,
// making a regex-based replacement fragile. Walking parens with a tiny
// state machine is reliable.
//
// Idempotent: running twice is a no-op because the second pass sees no
// matching toast.success after sendOne anymore.
import fs from 'node:fs'
import path from 'node:path'

const FILES = [
  'apps/web/src/app/(ori)/money/page.tsx',
  'apps/web/src/app/(ori)/play/page.tsx',
]

const SQ = String.fromCharCode(39)
const DQ = String.fromCharCode(34)
const BS = String.fromCharCode(92)
const BT = String.fromCharCode(96)

function findCloseParen(text, startIdx) {
  let depth = 0
  let inSingle = false
  let inDouble = false
  let inBack = false
  for (let i = startIdx; i < text.length; i++) {
    const c = text[i]
    if (inSingle) {
      if (c === BS) { i++; continue }
      if (c === SQ) inSingle = false
      continue
    }
    if (inDouble) {
      if (c === BS) { i++; continue }
      if (c === DQ) inDouble = false
      continue
    }
    if (inBack) {
      if (c === BT) inBack = false
      continue
    }
    if (c === SQ) { inSingle = true; continue }
    if (c === DQ) { inDouble = true; continue }
    if (c === BT) { inBack = true; continue }
    if (c === '(') depth++
    else if (c === ')') {
      if (depth === 0) return i
      depth--
    }
  }
  return -1
}

function transform(src) {
  // The repo is on Windows; files often have CRLF line terminators. JS
  // regex `.` does NOT match `\r` (it's a line terminator), so any pattern
  // anchored with `(.*)$` silently fails to match a CRLF-terminated line.
  // Strip the trailing `\r` per line, transform, and reattach when joining.
  const eol = src.includes('\r\n') ? '\r\n' : '\n'
  const lines = src.split(/\r?\n/)
  const out = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    const m = /^(\s*)await sendOne\((.*)$/.exec(line)
    if (!m) { out.push(line); i++; continue }
    const indent = m[1]
    let joined = m[2]
    let lineEnd = i
    let closeIdx = findCloseParen(joined, 0)
    while (closeIdx === -1 && lineEnd + 1 < lines.length) {
      lineEnd++
      joined += '\n' + lines[lineEnd]
      closeIdx = findCloseParen(joined, 0)
    }
    if (closeIdx === -1) { out.push(line); i++; continue }
    const msgText = joined.slice(0, closeIdx)
    const tail1 = joined.slice(closeIdx + 1)
    let k = lineEnd + 1
    while (k < lines.length && lines[k].trim() === '') k++
    if (k >= lines.length) { out.push(line); i++; continue }
    const tm = /^(\s*)toast\.success\((.*)$/.exec(lines[k])
    if (!tm) { out.push(line); i++; continue }
    let targs = tm[2]
    let tEnd = k
    let tClose = findCloseParen(targs, 0)
    while (tClose === -1 && tEnd + 1 < lines.length) {
      tEnd++
      targs += '\n' + lines[tEnd]
      tClose = findCloseParen(targs, 0)
    }
    if (tClose === -1) { out.push(line); i++; continue }
    const targText = targs.slice(0, tClose)
    const tail2 = targs.slice(tClose + 1)
    out.push(indent + 'const __r = await sendOne(' + msgText + ')' + tail1)
    out.push(indent + 'toastTx(' + targText + ', __r)' + tail2)
    i = tEnd + 1
  }
  return out.join(eol)
}

let total = 0
for (const rel of FILES) {
  const abs = path.resolve(rel)
  const src = fs.readFileSync(abs, 'utf8')
  const next = transform(src)
  if (next !== src) {
    fs.writeFileSync(abs, next, 'utf8')
    const before = (src.match(/await sendOne\(/g) || []).length
    const after = (next.match(/await sendOne\(/g) || []).length
    console.log(rel + ': ' + before + ' call sites; ' + (before - after) + ' converted')
    total += before - after
  } else {
    console.log(rel + ': no changes')
  }
}
console.log('total transformed: ' + total)
