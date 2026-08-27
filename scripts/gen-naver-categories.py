#!/usr/bin/env python3
# scripts/gen-naver-categories.py
# Regenerate src/lib/naver/naver-categories-full.ts from a Naver category XLS.
# Usage: python3 scripts/gen-naver-categories.py <path-to-category.xls>
# Requires: pip install pandas xlrd
# Prints validation + diff (added/removed) vs the current committed file.

import sys, os, re, subprocess
from datetime import datetime, date

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 scripts/gen-naver-categories.py <category.xls>"); sys.exit(1)
    xls = sys.argv[1]
    # UCE-5 (2026-08-27): source filename is expected to look like
    # "category_YYYYMMDD_HHMMSS.xls" (Naver Commerce API Center download
    # convention). Parse the embedded date so the generated file carries a
    # machine-readable freshness marker (CATEGORY_MASTER_GENERATED_AT) that
    # /api/cron/category-master-check can compare against today without
    # scraping the header comment. Falls back to "today" if the filename
    # doesn't match — never blocks generation over this.
    m = re.search(r'(\d{8})_\d{6}', os.path.basename(xls))
    generated_at = datetime.strptime(m.group(1), '%Y%m%d').date().isoformat() if m else date.today().isoformat()
    import pandas as pd
    df = pd.read_excel(xls, header=0, dtype=str)
    df.columns = ['code','d1','d2','d3','d4']
    for c in ['d1','d2','d3','d4']:
        df[c] = df[c].fillna('').str.strip()
    df['code'] = df['code'].fillna('').str.strip()
    df = df[df['code'].str.match(r'^\d{6,9}$', na=False)].copy()

    # validation
    assert df['code'].nunique() == len(df), "duplicate codes present"
    for c in ['d1','d2','d3','d4']:
        assert not df[c].str.contains("'").any(), f"single-quote in {c} breaks TS literal"

    target = 'src/lib/naver/naver-categories-full.ts'
    # collect OLD codes from current committed file (for diff)
    old_codes = set()
    if os.path.exists(target):
        with open(target, encoding='utf-8') as f:
            old_codes = set(re.findall(r"\['(\d{6,9})'", f.read()))
    new_codes = set(df['code'])
    added = sorted(new_codes - old_codes)
    removed = sorted(old_codes - new_codes)

    # build file
    def esc(s): return str(s).replace('\\','\\\\').replace("'", "\\'")
    L = []
    L.append('// src/lib/naver/naver-categories-full.ts')
    L.append(f'// Auto-generated from category XLS ({len(df):,} entries)')
    L.append(f'// Source: {os.path.basename(xls)} (Naver category update)')
    L.append('// DO NOT EDIT MANUALLY -- regenerate via scripts/gen-naver-categories.py')
    L.append('')
    L.append('export interface NaverCategoryEntry {')
    L.append('  code: string;'); L.append('  d1: string;'); L.append('  d2: string;')
    L.append('  d3: string;'); L.append('  d4: string;'); L.append('  fullPath: string;')
    L.append('}'); L.append('')
    L.append('// Compact: [code, d1, d2, d3, d4]')
    L.append('const R: string[][] = [')
    for _, r in df.iterrows():
        L.append(f"['{esc(r['code'])}','{esc(r['d1'])}','{esc(r['d2'])}','{esc(r['d3'])}','{esc(r['d4'])}'],")
    L.append('];'); L.append('')
    L.append('export const NAVER_CATEGORIES_FULL: NaverCategoryEntry[] = R.map(([code,d1,d2,d3,d4]) => ({')
    L.append('  code, d1, d2, d3, d4,')
    L.append("  fullPath: [d1,d2,d3,d4].filter(Boolean).join(' > '),")
    L.append('}));'); L.append('')
    L.append('// Dynamically derived from actual data to ensure all depth1 categories are included')
    L.append('export const NAVER_DEPTH1_LIST: string[] = Array.from(')
    L.append('  new Set(NAVER_CATEGORIES_FULL.map(c => c.d1).filter(Boolean))')
    L.append(').sort();'); L.append('')
    L.append(f'export const TOTAL_CATEGORY_COUNT = {len(df)};')
    L.append('')
    L.append('// UCE-5: freshness marker read by /api/cron/category-master-check —')
    L.append('// do not hand-edit; comes from the source XLS filename at regen time.')
    L.append(f"export const CATEGORY_MASTER_SOURCE_FILE = '{esc(os.path.basename(xls))}';")
    L.append(f"export const CATEGORY_MASTER_GENERATED_AT = '{generated_at}';")
    L.append('')
    L.append('/** leaf category code -> 전체 경로(트리명). 매칭 실패 시 코드 원문(추측 지양 - #82). */')
    L.append('export function categoryFullPath(code: string): string {')
    L.append("  return NAVER_CATEGORIES_FULL.find(c => c.code === code)?.fullPath ?? code;")
    L.append('}')
    with open(target, 'w', encoding='utf-8') as f:
        f.write('\n'.join(L) + '\n')

    print(f"[OK] wrote {target}")
    print(f"  entries: {len(df)} (old: {len(old_codes)})  net: {len(df)-len(old_codes):+d}")
    print(f"  ADDED   ({len(added)}): {added[:12]}{'...' if len(added)>12 else ''}")
    print(f"  REMOVED ({len(removed)}): {removed[:12]}{'...' if len(removed)>12 else ''}")

if __name__ == '__main__':
    main()
