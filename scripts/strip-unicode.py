#!/usr/bin/env python3
"""Replace common Unicode punctuation in .move sources with ASCII equivalents.
Move compiler rejects non-ASCII characters — even in comments.
"""
import os
import sys

REPLACEMENTS = {
    '\u2014': '--',    # em-dash
    '\u2013': '-',     # en-dash
    '\u2018': "'",     # left-single-quote
    '\u2019': "'",     # right-single-quote / apostrophe
    '\u201C': '"',     # left-double-quote
    '\u201D': '"',     # right-double-quote
    '\u2026': '...',   # ellipsis
    '\u2192': '->',    # right arrow
    '\u2190': '<-',    # left arrow
    '\u2194': '<->',   # left-right arrow
    '\u21D2': '=>',    # double right arrow
    '\u2022': '*',     # bullet
    '\u00A0': ' ',     # non-breaking space
    '\u2713': 'v',     # check mark
    '\u2717': 'x',     # cross
    '\u00B7': '.',     # middle dot
    '\u2028': '\n',    # line separator
    '\u2029': '\n\n',  # paragraph separator
    '\u00B5': 'u',     # micro sign
    '\u00B0': 'deg',   # degree
    '\u2032': "'",     # prime
    '\u2033': '"',     # double prime
}

def fix(path: str) -> bool:
    with open(path, 'rb') as f:
        data = f.read()
    try:
        s = data.decode('utf-8')
    except UnicodeDecodeError:
        return False
    orig = s
    for k, v in REPLACEMENTS.items():
        s = s.replace(k, v)
    # Strip any remaining non-ASCII as last resort.
    cleaned_chars = []
    unhandled = set()
    for ch in s:
        o = ord(ch)
        if o < 0x80 or ch in '\t\n\r':
            cleaned_chars.append(ch)
        else:
            unhandled.add(ch)
            cleaned_chars.append('?')
    s = ''.join(cleaned_chars)
    if s != orig:
        with open(path, 'wb') as f:
            f.write(s.encode('ascii'))
        if unhandled:
            print(f"[fixed-with-strip] {path} (unhandled: {unhandled!r})")
        else:
            print(f"[fixed]             {path}")
        return True
    return False

def main() -> int:
    root = sys.argv[1] if len(sys.argv) > 1 else '.'
    count = 0
    for dirpath, _, filenames in os.walk(root):
        for fn in filenames:
            if fn.endswith('.move'):
                p = os.path.join(dirpath, fn)
                if fix(p):
                    count += 1
    print(f"{count} file(s) updated")
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
