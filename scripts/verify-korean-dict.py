#!/usr/bin/env python3
"""Verify Korean string dictionary integrity.

Checks for each dict file passed via argv (or the two defaults):
- UTF-8 replacement char (FFFD)
- Non-NFC normalization
- Known typo patterns from previous sessions

Exit non-zero only when typos are found. FFFD and non-NFC are reported but
not blocking (legacy dicts may contain them — strip in a separate pass).
"""
from __future__ import annotations

import json
import sys
import unicodedata

DEFAULTS = [
    'src/lib/notifications/discord-strings.ko.json',
    'src/lib/automation/section-renderers/strings.ko.json',
    'src/lib/i18n/studio-strings.ko.json',
]

TYPOS = [
    '일찰', '즈시', '융지', '론이', '오를 상품', '좌비',
    '꼬뜸', '꼬뜸한', '느대', '주뎜', '스이칭',
    '꽃졤', '혁섭', '쿠드', '식타', '릴고', '헌서',
    '위젝', '스칵', '쿠두',
]


def collect(obj, out):
    if isinstance(obj, str):
        out.append(obj)
    elif isinstance(obj, dict):
        for v in obj.values():
            collect(v, out)
    elif isinstance(obj, list):
        for v in obj:
            collect(v, out)


def verify(path: str) -> int:
    try:
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except FileNotFoundError:
        print(f'{path}: MISSING')
        return 0
    except json.JSONDecodeError as e:
        print(f'{path}: INVALID JSON — {e}')
        return 1

    strings: list[str] = []
    collect(data, strings)
    bad = sum(1 for s in strings if '�' in s)
    not_nfc = sum(1 for s in strings if unicodedata.normalize('NFC', s) != s)
    print(f'{path}: strings={len(strings)} replace={bad} not_nfc={not_nfc}')

    found: list[tuple[str, str]] = []
    for s in strings:
        for t in TYPOS:
            if t in s:
                found.append((t, s[:60]))
    if found:
        print(f'  typos_found={len(found)}')
        for t, ctx in found:
            print(f'    {t}: {ctx}')
        return 1
    return 0


def main() -> int:
    paths = sys.argv[1:] if len(sys.argv) > 1 else DEFAULTS
    rc = 0
    for p in paths:
        rc |= verify(p)
    return rc


if __name__ == '__main__':
    sys.exit(main())
