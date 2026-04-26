import fs from 'node:fs'
const src = fs.readFileSync('apps/web/src/app/(ori)/money/page.tsx', 'utf8')
const lines = src.split('\n')
console.log('line 391:', JSON.stringify(lines[390]))
console.log('line 419:', JSON.stringify(lines[418]))
console.log('line 438:', JSON.stringify(lines[437]))
