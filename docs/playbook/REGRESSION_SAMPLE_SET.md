# REGRESSION_SAMPLE_SET — 카테고리 매처 회귀 검증 표본 세트

> 신설 2026-09-21 (CORE_WORKING_PRINCIPLES 학습화개선 #2, rev185/186 후속).
> 목적: rev185(#45 스트랩)에서 "118건 잠재충돌 중 7~8건만 즉흥 표본검증"했던
> 것의 재발 방지. 카테고리 매처(`category-deterministic-matcher.ts`,
> `category-ai-suggest.ts`) 판정 로직을 고칠 때마다 이 표본 세트를 그대로
> curl로 돌려, 전 상품 공통 관점에서 회귀를 즉시 잡는다(원칙#379 실행 도구).
>
> 표본은 마스터 데이터(`naver-categories-full.ts`)를 실제로 grep해서 뽑은
> 것이라 임의 추측이 아니다 — 아래 "표본 재생성 스크립트"로 언제든 최신화
> 가능.

---

## 사용법

카테고리 매처 코드를 수정한 뒤, 배포 완료 확인 후 아래 스크립트를 그대로
실행한다. 각 그룹은 서로 다른 실패 클래스를 대표하므로 전부 돌린다 —
일부만 돌리고 "회귀 없음"이라고 결론 내지 않는다.

```bash
#!/bin/bash
# scripts/verify-category-regression.sh 로 저장해 재사용 가능
BASE="https://kkotium-garden.vercel.app/api/category/suggest"
TAG=$(date +%s)  # 매 실행마다 다른 캐시 미스 유도

check() {
  local name="$1"
  local expected_d1="$2"
  local result=$(curl -s -X POST "$BASE" -H "Content-Type: application/json" \
    -d "{\"productName\":\"$name REGCHK$TAG\"}")
  local d1=$(echo "$result" | python3 -c "import json,sys; print(json.load(sys.stdin)['suggestions'][0]['d1'])")
  if [ "$d1" = "$expected_d1" ]; then
    echo "✅ $name -> $d1"
  else
    echo "❌ $name -> $d1 (기대: $expected_d1)"
  fi
}

echo "=== 그룹A: 슬래시-합성어 교차도메인(IDIOM-6 클래스) ==="
check "휴대폰 스트랩 액세서리" "디지털/가전"
check "카메라 스트랩" "디지털/가전"
check "아로마 디퓨저 세트" "가구/인테리어"
check "골프 우산" "스포츠/레저"

echo "=== 그룹B: 완전동음이의(같은 leaf명, 다른 d1) ==="
check "우아한 헤어핀 액세서리" "패션잡화"
check "유아용 헤어핀" "출산/육아"
check "여성 니트 카디건" "패션의류"
check "휴대폰 케이스" "디지털/가전"

echo "=== 그룹C: 일반 상품(회귀 없어야 할 대조군) ==="
check "남성 골프 바지" "스포츠/레저"
check "여성 등산 바지" "스포츠/레저"
check "천연 비취 옥반지" "패션잡화"
```

---

## 표본 목록 근거 (grep 출처)

### 그룹A — 슬래시-합성어 교차도메인 (전체 70건 중 대표 5개)

마스터에서 슬래시로 묶인 leaf(`"삼각대가방/스트랩"` 형태)의 한 파트가
서로 다른 d1(대분류)에 걸쳐 재등장하는 경우 — 2026-09-21 rev185 #45(스트랩)
사고와 정확히 같은 클래스. 재생성 커맨드:
```bash
python3 -c "
import re
from collections import defaultdict
with open('src/lib/naver/naver-categories-full.ts', encoding='utf-8') as f:
    content = f.read()
rows = re.findall(r\"^\['(\d+)','([^']*)','([^']*)','([^']*)','([^']*)'\],?\$\", content, re.M)
part_to_paths = defaultdict(list)
for code, d1, d2, d3, d4 in rows:
    leaf = d4 or d3
    if not leaf or '/' not in leaf: continue
    for p in leaf.split('/'):
        if len(p) >= 2: part_to_paths[p].append((d1, d2, d3, d4))
cross = {p: v for p, v in part_to_paths.items() if len(set(x[0] for x in v)) > 1}
print(f'{len(cross)}건'); [print(p, sorted(set(x[0] for x in v))) for p, v in list(cross.items())[:20]]
"
```
전체 70건 목록은 위 스크립트로 언제든 재생성 가능(고정 파일로 안 남기는
이유: 마스터 데이터가 갱신되면 이 목록도 stale해지므로, 스크립트를 정본으로
둔다).

### 그룹B — 완전동음이의 (전체 90건 중 대표 5개)

같은 leaf명이 서로 다른 d1에 완전히 동일한 이름으로 존재 — 2026-09-17
rev184 #44(헤어핀 유아/성인) 사고와 같은 클래스. 재생성 커맨드:
```bash
python3 -c "
import re
from collections import defaultdict
with open('src/lib/naver/naver-categories-full.ts', encoding='utf-8') as f:
    content = f.read()
rows = re.findall(r\"^\['(\d+)','([^']*)','([^']*)','([^']*)','([^']*)'\],?\$\", content, re.M)
leaf_to_paths = defaultdict(list)
for code, d1, d2, d3, d4 in rows:
    leaf = d4 or d3
    if not leaf or '/' in leaf: continue
    leaf_to_paths[leaf].append((d1, d2, d3, d4))
homonyms = {l: v for l, v in leaf_to_paths.items() if len(set(x[0] for x in v)) > 1}
print(f'{len(homonyms)}건'); [print(l, sorted(set(x[0] for x in v))) for l, v in list(homonyms.items())[:20]]
"
```

### 그룹C — 일반 상품(대조군)

과거 세션에서 정답이 확정됐던 상품명 — 매처 수정이 "정상 케이스까지
망가뜨리지 않는가"를 확인하는 기준선. 새 정상 케이스가 확정될 때마다 이
목록에 추가한다.

## 알려진 불안정 케이스 (2026-09-21 실측)

"유아용 헤어핀"은 재실행할 때마다 패션잡화/출산·육아 사이에서 결과가
흔들림을 확인(같은 매처 코드, 같은 배포 상태에서). 원인은 매처 버그가
아니라 AI 크로스체크(Gemini/Groq) 응답 자체의 비결정성으로 추정 —
"유아용"이라는 수식어 하나만으로는 AI에게도 확신을 주기 부족한
경계 케이스. `verify-category-regression.sh`가 이 케이스에서 실패를
보고해도 **그 자체로 회귀 확정은 아니다** — 같은 실행을 3회 반복해
다수결로 판단하거나, `needsConfirmation` 값(true면 정직한 불확실
표시이지 오분류가 아님)을 함께 확인한다.

---

## 유지 규칙

- 카테고리 매처 관련 결함(#43~45류)이 새로 발생하면, 그 사고의 근본원인이
  속하는 클래스(슬래시-합성어/동음이의/제3의 새 클래스)를 먼저 판별하고,
  기존 그룹에 대표 사례를 1~2개 추가하거나 새 그룹(D, E...)을 신설한다.
- 표본은 "실제로 낚였던 사례"와 "낚이지 않아야 할 인접 사례"를 함께 넣는다
  — IDIOM-6/#383처럼 discount 수정이 정상 케이스를 회귀시킨 전례가 있으므로,
  대조군 없이 낚인 사례만 검증하면 회귀를 놓친다.
- 이 문서 자체는 grep 커맨드와 표본만 담고, 결과는 담지 않는다(결과는 매번
  실행해서 확인하는 것이지 문서에 박제할 대상이 아니다).

**적용 원칙**: #379(전 상품 확장검증), #295(단일권위), IDIOM-6.
