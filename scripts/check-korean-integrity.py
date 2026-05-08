#!/usr/bin/env python3
# scripts/check-korean-integrity.py
# Verify both files have no broken Korean syllable patterns after unicode escape decoding.

import re
import codecs
import sys

BROKEN_PATTERNS = [
    '\uc4de\uc2a4', '\ub290\ub300\uace0', '\ubc14\uc0c1', '\uc8fc\ub39c', '\uc8fc\ub39c',
    '\uc8fc\ub384', '\ucfe0\ub450', '\ud601\uc12d', '\ucfe0\ub4dc', '\uc2dd\ud0c0',
    '\ub9b4\uace0', '\ud5cc\uc11c', '\uc704\uc81d', '\uc2a4\uce75', '\uaf43\uc930',
]

def check_file(path):
    with open(path, encoding='utf-8') as f:
        content = f.read()
    try:
        decoded = codecs.decode(content, 'unicode_escape')
    except Exception:
        decoded = content
    found = []
    for p in BROKEN_PATTERNS:
        if p in decoded:
            found.append(p)
    return found, content.count('\\u'), len(content)

files = [
    'scripts/test-discord-5-channels.mjs',
    'src/lib/notifications/discord-builder.ts',
    'src/lib/discord.ts',
]

all_clean = True
for fp in files:
    try:
        broken, escape_count, size = check_file(fp)
        if broken:
            print(f'[FAIL] {fp}: broken={broken}')
            all_clean = False
        else:
            print(f'[OK]   {fp}: escapes={escape_count} size={size}')
    except FileNotFoundError:
        print(f'[SKIP] {fp}: not found')

sys.exit(0 if all_clean else 1)
