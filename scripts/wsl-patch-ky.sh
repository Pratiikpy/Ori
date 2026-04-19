#!/usr/bin/env bash
set -eu
F="/mnt/c/Users/prate/Downloads/Initia builder/ori/node_modules/.pnpm/ky@2.0.1/node_modules/ky/distribution/utils/merge.js"
echo "=== BEFORE ==="
head -40 "$F"
echo
echo "=== applying prefixUrl -> prefix compatibility shim ==="
# Insert a tiny normalizer at the top of validateAndMerge's sources loop.
# The file's structure is: `export const validateAndMerge = (...sources) => { ... }`
# We'll replace the first line of the export with a version that first
# rewrites prefixUrl -> prefix on each source so ky@2 stops throwing.
python3 - "$F" <<'PY'
import sys, re, pathlib
p = pathlib.Path(sys.argv[1])
src = p.read_text(encoding='utf-8')
if 'ORI_KY_SHIM' in src:
    print('already patched')
    sys.exit(0)
needle = 'export const validateAndMerge = (...sources) => {'
replacement = (
    'export const validateAndMerge = (...sources) => {\n'
    '    // ORI_KY_SHIM: translate legacy `prefixUrl` -> `prefix` in place so\n'
    '    // packages built against ky@1 keep working with ky@2 hoisted.\n'
    '    for (const s of sources) {\n'
    '      if (s && Object.prototype.hasOwnProperty.call(s, "prefixUrl") && !("prefix" in s)) {\n'
    '        s.prefix = s.prefixUrl;\n'
    '        delete s.prefixUrl;\n'
    '      }\n'
    '    }\n'
)
if needle not in src:
    print('needle not found; aborting')
    sys.exit(1)
src2 = src.replace(needle, replacement, 1)
p.write_text(src2, encoding='utf-8')
print('patched')
PY
echo
echo "=== AFTER ==="
head -20 "$F"
