# HANDOFF — G5 prefill 자동 판매가가 순마진 음수 상품 생성 (적자가격 설계결함)

> **작성**: 2026-05-28 Desktop turn (Track B G5 정주행 검증 중 발견)
> **상태**: [CLOSED 2026-05-28 Desktop] — fix 9415169 production 재검증 통과. 36904429 등록 시작 -> 새 prefill salePrice 10,374 -> **13,900원** (순마진율 **+15.5%** 실측, 핸드오프 예측치 13,811 일치). calcPrefillSalePrice 실효 확정. 꼬띠 추천가 흑자가 자동주입 동작 확인.
> **베이스라인**: HEAD `9415169` (origin/main, Vercel READY) — fix 반영본
> **발견 경로**: Track B G4/G5 게이트 — 36904429 prefill 자동 판매가 -> 꼬띠 D등급/순마진 음수

---

## 1. 증상

`/crawl` -> 36904429 "등록 시작" -> prefill 자동 판매가 **10,374원** (공급가 7,980원의 단순 30% 마크업). 그러나 꼬띠 꿀통지수 패널 실측:

| 항목 | 값 |
|---|---|
| 꿀통지수 등급 | **D등급 (위험!)** |
| 점수 | 17 |
| 총마진율 | 23.1% |
| **순마진율** | **-11.3%** (네이버 수수료 5.5% + 배송비 반영) |
| 권고 | "등록 비추천 — 손익분기점 미달, 리스크 높음" |

-> G4(꼬띠점수)/G5(MarginCalculator)는 **정상 작동** (깨진 값 0 = B-7 회귀 없음). 문제는 prefill이 **적자 판매가를 자동으로 박는 가격 산정 공식**.

## 2. 근본 원인

prefill 페이로드 생성 측(`/crawl` 등록 시작 핸들러 또는 크롤 데이터 -> prefill 인코딩 지점)에서 `salePrice = round(supplierPrice * 1.30)` 류의 **단순 마크업**을 사용. 7,980 * 1.30 ≈ 10,374. 이 공식은:

- 네이버 판매수수료(약 5.5%)
- 기본 배송비(3,000원, 무료배송 전환 시 판매가 흡수)
- 반품/광고 리스크

를 고려하지 않아 **총마진(23.1%)은 양수지만 순마진(-11.3%)은 음수**가 된다. 새싹 셀러가 꼬띠 경고를 무시하고 등록하면 팔수록 손해.

> 정확한 공식 위치는 Code가 `grep -rn "salePrice" src/app/api/crawler/` + `/crawl` 페이지 등록 시작 핸들러에서 prefill payload 빌드 지점을 특정해 단정할 것. (Desktop은 결과값 10,374만 실측, 공식 코드는 미확인.)

## 3. 영향 범위 (P1)

- 저마진 상품(생활용품/저가 위탁)일수록 단순 마크업이 손익분기 미달 -> 셀러 손실.
- 꼬띠가 D등급으로 경고하지만, prefill이 "그럴듯한 가격"을 미리 박아두면 셀러가 그대로 등록할 유인 발생.
- 새싹 -> 파워셀러 성장에 역행(첫 상품이 적자 구조).

## 4. 근본 수정 명세 (Code — 하이브리드 확정, 2026-05-28 대표 승인)

**확정 방향 = 하이브리드 (A의 흑자 보장 자동주입 + B의 투명성 검토)**: prefill이 판매가를 비워두는 게 아니라 **순마진 흑자가를 자동으로 채우되**, 칸 아래에 "꼬띠 추천가(순마진 15%)" 라벨 + 시장가 비교 칩을 붙여 셀러가 즉시 검토/수정하게 한다.

### Fix A-core — prefill 자동 판매가를 최소 순마진 보장가로 교체 (prefill payload 빌드 지점)

```
기존 (적자 원인):  salePrice = round(supplierPrice * 1.30)

교체 (흑자 보장):
  const NAVER_FEE_RATE   = 0.055;   // 기본 수수료 (카테고리별 차이는 향후 고도화)
  const TARGET_NET_MARGIN = 0.15;   // 최소 순마진 목표 15%
  const shipBurden = crawlShipFee ?? 3000;   // 무료배송 정책 시 셀러 흡수분
  const raw = (supplierPrice + shipBurden) / (1 - NAVER_FEE_RATE - TARGET_NET_MARGIN);
  salePrice = Math.ceil(raw / 100) * 100;     // 100원 단위 반올림
  // 예: (7980 + 3000) / (1 - 0.055 - 0.15) = 10980 / 0.795 = 13811 -> 13,900원 (순마진 ~15.5%)
```

> 계산 위치: G5 증상의 10,374 출처가 prefill payload 빌드 지점(`/crawl` 등록 시작 핸들러 또는 크롤 -> prefill 인코딩). `grep -rn "salePrice\|* 1.3\|supplierPrice \*" src/app/api/crawler/ src/app/crawl/` 로 단순 마크업 공식을 특정 후 교체.

> 배송 정책 순환 주의: 판매가가 배송전략(>=25k 무료 / >=10k 조건부 / <10k 유료)을 결정하고 배송부담은 다시 최소가에 영향하는 순환 구조. 최초 계산은 crawlShipFee(기본 3000)를 burden으로 고정 적용하고, 무료배송 전환 시에도 이 burden이 이미 흡수되도록 하여 보수적으로 육한다(과소추정 방지).

### Fix B-transparency — 판매가 칸 아래 추천가 라벨 + 시장가 칩 (src/app/products/new/page.tsx, 기본정보 탭 판매가 Field)

- 판매가 입력란 하단에 "꼬띠 추천가 (순마진 15%): N원" 라벨 표시 (prefill 자동값이 추천가임을 명시).
- 기존 `MarketPriceHint` 칩(시장 평균/저렴/높음)을 그대로 재사용 -> 셀러가 시장가 대비 자신의 가격을 즉시 판단.
- 셀러가 판매가를 수정하면 꿀통지수/마진 패널이 실시간 재계산(기존 동작 유지).
- prefill 자동값은 흑자가이므로 꼬띠 꿀통지수가 D등급이 아닌 양수 마진 등급으로 뜨는 게 정상.

### 하이브리드 이점 (설계 근거)

| 효과 | A소스 | B소스 |
|---|---|---|
| 적자 가격 자동주입 0 | 흑자 보장가 자동 | — |
| 셀러 검토 주도권 | — | 추천가 라벨 + 시장가 칩 |
| 클릭 부담 | 0 (자동 채움) | — |

기존 폼에 `MarketPriceHint` + `MarginAdvisorPanel`이 이미 있어 추가 개발 부담 작음.

## 5. 검증 (Code)

- `npx tsc --noEmit` 0 / `npm run build` exit 0 / 한글 sentinel grep 0
- push 후 `scripts/verify-vercel-deploy.sh --wait` exit 0

## 6. 검증 후 재개 동선 (Desktop)

Code fix + Vercel READY 시 Desktop이 동일 36904429로:

1. `/crawl` -> 등록 시작 -> prefill 자동 판매가 단정
2. 꼬띠 꿀통지수 순마진율 **양수** 확인 (또는 판매가 비움 + 추천가 제안 동작 확인)
3. 통과 시 본 핸드오프 헤더 -> `[CLOSED]` + TASK_BRIDGE §7 ARCHIVED

## 7. 비고

- G2 카테고리 silent skip 핸드오프(`HANDOFF_g2_category_prefill_skip_2026-05-28.md`)와 동일 turn 연속 발견. 둘 다 prefill 파이프라인(크롤 -> 등록 시작 -> 폼 자동입력) 신뢰성 트랙이라 Code에서 묶어 처리 효율적.
- 36904429 = 적자가격 재현 골든 픽스처(공급가 7,980 / 자동 판매가 10,374 / 순마진 -11.3%). fix 후 회귀 테스트 케이스로 보존.
