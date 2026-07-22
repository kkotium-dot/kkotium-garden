#!/usr/bin/env python3
# scripts/persona-audit.py
# =============================================================================
# 꼬띠 페르소나 적용 감사 (작업원칙 #283).
#
# ── 왜 독자(audience) 축이 필요한가 ──────────────────────────────────────────
# 이 스크립트는 원래 키 이름(empty|error|hint|desc|notice…)만 보고 "페르소나가
# 붙어야 할 문구"를 골랐다. 그런데 `noticeCards`(교환·반품 안내)나
# `scents[].desc`(향 설명)처럼 **네이버 고객이 보는 상품 상세페이지 카피**도
# 같은 키 이름을 쓴다. 그 결과 감사 결과를 그대로 믿고 작업하면 고객이 보는
# 상품 페이지에 "까꿍💖"·"이랴"가 들어가는 사고가 난다(2026-07-22 실제 직전에
# 발견·차단).
#
# 꼬띠는 **셀러(운영자)가 보는 앱 내부 마스코트**다. 고객은 꼬띠를 모른다.
# 따라서 페르소나 적용 대상은 "셀러가 보는 앱 UI 문구"로 한정하고, 고객 대면
# 카피는 **명시적으로 제외**하되 침묵 제외가 아니라 목록으로 보여준다
# (조용히 빠지면 다음 사람이 또 헷갈린다).
# =============================================================================

import json, re, glob

ROOT = "/Users/jyekkot/Desktop/kkotium-garden/src"
PERSONA = re.compile(r"까꿍|빵야|이랴|어유|에유|해유")
# 페르소나가 붙어야 마땅한 키(빈 상태·에러·안내·성공) — 라벨/버튼은 대상 아님
TARGET_KEY = re.compile(r"empty|error|success|toast|hint|guide|desc|notice|help|fail|warn", re.I)

# ── 고객 대면 카피 (페르소나 적용 금지) ──────────────────────────────────────
# 네이버 상품 상세페이지에 실제로 렌더되는 문구. 셀러용 마스코트 보이스가
# 들어가면 브랜드 신뢰를 해치고, 교환·반품 같은 고지 문구는 법적 성격도 있다.
CUSTOMER_FACING = (
    "components/detail/preset/samples.ko.json",          # 상세페이지 샘플(실제 판매 카피)
    "lib/automation/section-renderers/strings.ko.json",  # 상세페이지 섹션 렌더러
    "lib/i18n/detail-content-templates.ko.json",         # 상세페이지 프리셋 템플릿
)

rows, excluded = [], []

for path in glob.glob(f"{ROOT}/**/*ko.json", recursive=True):
    try:
        d = json.load(open(path, encoding="utf-8"))
    except Exception:
        continue

    hits, targets = [], []

    def walk(o, p=""):
        if isinstance(o, dict):
            for k, v in o.items():
                walk(v, f"{p}.{k}" if p else k)
        elif isinstance(o, list):
            for i, v in enumerate(o):
                walk(v, f"{p}[{i}]")
        elif isinstance(o, str):
            if PERSONA.search(o):
                hits.append(p)
            if TARGET_KEY.search(p) and len(o) > 8:
                targets.append(p)

    walk(d)
    rel = path.replace(ROOT + "/", "")
    if rel in CUSTOMER_FACING:
        if targets:
            excluded.append((rel, len(targets)))
        continue
    if targets:
        rows.append((rel, len(targets), len(hits)))

rows.sort(key=lambda r: (r[2], -r[1]))
print(f"{'파일 (셀러 대면 앱 UI)':52} {'대상문구':>6} {'페르소나':>7}")
print("-" * 70)
for rel, t, h in rows[:20]:
    mark = "  ← 0건" if h == 0 else ""
    print(f"{rel:52} {t:6} {h:7}{mark}")

zero = [r for r in rows if r[2] == 0]
print(f"\n대상 파일 {len(rows)}개 중 페르소나 0건: {len(zero)}개")

if excluded:
    print(f"\n[제외 — 고객 대면 상품 카피, 페르소나 적용 금지 #283]")
    for rel, t in excluded:
        print(f"  · {rel} (문구 {t}개)")
    print("  네이버 고객이 보는 상세페이지 문구입니다. 꼬띠 보이스를 넣지 마세요.")
