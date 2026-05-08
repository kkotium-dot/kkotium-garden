#!/usr/bin/env python3
"""Verify Korean string dictionary integrity.

Checks:
- UTF-8 replacement char (FFFD)
- Non-NFC normalization
- Known typo patterns from previous sessions
"""
import json
import unicodedata

PATH = 'src/lib/notifications/discord-strings.ko.json'

with open(PATH, 'r', encoding='utf-8') as f:
    data = json.load(f)


def collect(obj, out):
    if isinstance(obj, str):
        out.append(obj)
    elif isinstance(obj, dict):
        for v in obj.values():
            collect(v, out)
    elif isinstance(obj, list):
        for v in obj:
            collect(v, out)


strings = []
collect(data, strings)

bad = sum(1 for s in strings if '\uFFFD' in s)
not_nfc = sum(1 for s in strings if unicodedata.normalize('NFC', s) != s)
print(f'strings={len(strings)} replace={bad} not_nfc={not_nfc}')

TYPOS = [
    '일찰', '즈시', '융지', '론이', '오를 상품', '좌비',
    '꼬뜸', '꼬뜸한', '느대', '주뎜', '스이칭',
    '꽃졤', '혁섭', '쿠드', '식타', '릴고', '헌서',
    '위젝', '스칵', '쿠두',
]
found = []
for s in strings:
    for t in TYPOS:
        if t in s:
            found.append((t, s[:60]))
print(f'typos_found={len(found)}')
for t, ctx in found:
    print(f'  {t}: {ctx}')

print('--- samples (3) ---')
for s in strings[:3]:
    print(repr(s[:80]))
