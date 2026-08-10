# 작업 결과 — 꼬띠 소싱 v2 로드맵 1b (다중 발굴 렌즈) (2026-08-10)

> **작성**: Claude Code
> **BASELINE**: `27b3297` → 이 작업의 커밋
> **원본 지시**: `docs/handoff/CODE_SOURCING_V2_LENSES_HANDOFF_2026-08-10.md`
> **검증**: `npx tsc --noEmit` 0 errors · `npm run build` 0 errors · 로컬 스크립트로 순수함수 단위 검증(작업 후 삭제)

---

## 요약

설계 문서(`docs/design/KKOTTI_DAILY_SOURCING_V2_2026-08-07.md` §3-0)의 8개 발굴 렌즈(급상승📈·시즌선점🗓️·니치💎·블루오션🌊·꿀통🍯·황금🏆·스테디📚 + 레드오션⚠️경고)를 구현. 지시대로 신규 대발명이 아니라 **기존 3렌즈 분류기(`naver/recommendation-type.ts`)와 `naver/category-score.ts`·`naver-margin-advisor.ts`를 재사용**하는 순수 분류 계층을 새로 얹었다.

## write set (지시 범위 그대로)

| 파일 | 작업 |
|---|---|
| `src/lib/sourcing-lenses.ts`(신규) | 8개 렌즈 정의 + 판정 로직 + 배분 상수 + 배분 함수 |
| `src/lib/trend-analyzer.ts` | 급상승률(risingRate)·변동성(volatility) 신호 추가 |

**`naver/recommendation-type.ts`는 손대지 않음** — 이유는 아래 §설계 판단 참조.

**수정 금지 목록 확인**: `wholesale-matcher.ts` · `cron/*` · `.github/workflows/*` — git diff로 전부 미변경 확인.

---

## 1. `trend-analyzer.ts` — 급상승률·변동성 신호

**재호출 최소화**: 기존 `fetchDataLabTrends()`가 이미 매번 DataLab에서 7일치 카테고리별 시계열(`data: [{period, ratio}]`)을 가져오면서 "최신 1일치 ratio"만 뽑아 썼다. 이 시계열 재해석만으로 상승률·변동성을 구할 수 있어 **API 재호출을 추가하지 않았다** — 배치 fetch 로직(`fetchRawCategorySeries`)을 내부 함수로 분리해 `fetchDataLabTrends()`와 신규 `fetchCategoryTrendSignals()`가 같은 호출을 공유하도록 리팩터링했다(기존 `fetchNaverTrends()`/`matchProductsToTrends()` 시그니처·동작은 100% 동일 — 이 둘을 쓰는 `sourcing-recommender.ts`·`daily-signals.ts`는 무영향).

**신규 export**:
- `computeRisingRate(ratios)` — 시계열 전반부 평균 대비 후반부 평균 변화율(%). 순수함수.
- `computeVolatility(ratios)` — 변동계수(표준편차/평균×100, %). 낮을수록 안정 = 스테디.
- `classifyTrendSignal(name, data)` — 위 둘을 합쳐 `CategoryTrendSignal`(isRising/isStable 포함) 생성. 데이터가 4포인트 미만이면 "얇은 데이터"로 보고 rising/stable 둘 다 false(정직한 미달, #231) — 근거 없이 판정하지 않음.
- `fetchCategoryTrendSignals()` — DataLab 자격증명 없을 때 `fetchNaverTrends()`와 동일하게 빈 배열로 조용히 폴백(크론이 트렌드 데이터 없이도 계속 도는 기존 패턴 유지).

## 2. `sourcing-lenses.ts` — 8개 렌즈

**재사용 매핑** (설계 §3-0 표 그대로):

| 렌즈 | 신호원 | 재사용 여부 |
|---|---|---|
| 📈 급상승 | `trendSignal.isRising`(신규) | trend-analyzer.ts 신규 신호 |
| 🗓️ 시즌선점 | `naver-margin-advisor.getMarginAdvice().seasonMonths` | 100% 재사용, 판정만 신규(아래 참조) |
| 💎 니치 | `computeCategoryScore().roiScore`≥45 & `seoScore`<60 | 재사용(`recommendation-type.ts`의 니치 임계값과 동일) |
| 🌊 블루오션 | 외부에서 계산된 `blueOceanScore`(주입값) | **재계산 안 함** — wholesale-matcher/sourcing-recommender 소유, 그대로 재사용 |
| 🍯 꿀통 | `roiScore`≥70 | 재사용(임계값만 황금보다 엄격하게 신규 설정) |
| 🏆 황금 | `seoScore`≥60 & `roiScore`≥60 | 100% 재사용(`recommendation-type.ts`의 golden 조건과 동일 로직) |
| 📚 스테디 | `trendSignal.isStable`(신규) | trend-analyzer.ts 신규 신호 |
| ⚠️ 레드오션(경고) | `uniqueSellersInTop`≥8 & `competitionLevel==='high'` | 발굴 렌즈 아님 — 다른 렌즈로 뽑힌 후보에 경고만 |

**시즌선점 vs 급상승 구분**: 기존 `recommendation-type.ts`의 `seasonalNow()`는 "이번달 또는 다음달이 성수기"를 하나로 묶어 "지금 뜨는 것"과 "곧 올 시즌"을 구분하지 못한다. `sourcing-lenses.ts`의 `seasonalLeadWindow()`는 의도적으로 **1~2개월 뒤(리드 윈도우)만** 시즌선점으로 잡아 급상승 렌즈와 겹치지 않게 했다 — 설계 문서가 "시즌 선점이 핵심 차별점"이라 명시한 부분을 살리기 위한 신규 판정.

**다중 배지**: `classifySourcingLenses()`는 하나의 결과가 아니라 매칭된 모든 렌즈를 배열로 반환한다(설계: "한 상품이 여러 렌즈에 동시 해당 가능"). 예: 검색 급상승 + 마진 우수 상품은 `['rising', 'honeypot', 'golden']` 전부 동시에 매칭됨.

**레드오션은 별도 타입**: 처음에 `LensMatch`(SourcingLens 필요) 재사용을 시도했다가, 레드오션은 발굴 렌즈가 아니므로 타입에 억지로 끼워 넣는 게 잘못이라 판단해 `RedOceanWarning`(lens 필드 없는 독립 타입)으로 분리했다 — "경고는 렌즈가 아니다"를 타입 시스템에서도 강제.

**배분 상수화**(하드코딩 금지 지시 준수): `LENS_DAILY_QUOTA = { rising:2, seasonal:2, niche:2, blueOcean:2, honeypot:1, steady:1 }`(설계 문서 예시 그대로, 합계 10). 황금은 전용 슬롯이 아니라 다른 렌즈와 겹치는 오버레이 태그, 레드오션은 경고라 배분 대상에서 제외 — 이 판단 근거를 주석으로 명시.

**`allocateByLens()`**: 렌즈별로 후보를 채우는 순수 배분 함수. 이미 다른 렌즈 슬롯에 뽑힌 후보는 중복 배정하지 않고(dedup), 쿼터를 못 채우면 침묵하지 않고 `unfilledLenses`로 **정직하게 미달 표시**(#325 원칙).

## 3. `naver/recommendation-type.ts` 미수정 판단

핸드오프는 "필요시" 확장으로 옵션 처리했다. `sourcing-lenses.ts`가 이미 동일한 emoji+label 메타데이터 패턴(`LENS_META`)을 자체 보유하므로 중복 확장이 불필요했고, 기존 3렌즈 분류기는 `sourcing-recommender.ts` 등 실제 프로덕션 소싱 파이프라인이 지금도 쓰고 있어 — 이번 작업 범위(신규 모듈 구축, 파이프라인 교체 아님)에서 손대면 불필요한 영향 범위 확대였다. **미수정.**

## 4. 검증

- `npx tsc --noEmit` 0 errors.
- `npm run build` 0 errors.
- 로컬 임시 스크립트(`tsx`)로 순수함수 단위 검증(작업 완료 후 삭제, 커밋에 없음):
  - 상승 시계열(`[10,12,11,20,25,30,35]`) → `risingRate` 150%, `isRising: true` 확인.
  - 평탄 시계열(`[20,21,19,20,22,19,20]`) → `volatility` 4.9%, `isStable: true` 확인.
  - 하락 시계열 → `risingRate` 음수 확인(상승률 계산이 방향성도 정확히 반영).
  - 데이터 1포인트(얇은 데이터) → `isRising`/`isStable` 둘 다 false(근거 없이 판정 안 함, #231) 확인.
  - 급상승+마진우수+검색활황 후보 → `['rising','honeypot','golden']` 3개 렌즈 동시 매칭 확인(다중 배지 요구사항).
  - 겨울잠옷(9월 시점, 성수기 10~1월) → 시즌선점 렌즈 정확히 매칭 확인(리드 윈도우 판정 검증).
  - competition high + 상위 판매자 15곳 → 레드오션 경고 정확히 발동 확인.
  - `allocateByLens()` → 중복 배정 없음, 총 쿼터 초과 없음, 미달 렌즈 정직하게 보고 확인.

## 5. 실 API 재호출 여부

**추가된 외부 API 호출 없음.** 급상승/스테디 신호는 `fetchDataLabTrends()`가 이미 매번 가져오던 7일치 시계열을 재해석한 것뿐이다(§1 참조). 블루오션 점수는 재계산하지 않고 외부(wholesale-matcher/sourcing-recommender, 로드맵1 소유)에서 계산된 값을 주입받아 재사용한다.

## 6. 다음 단계 (이번 범위 밖 — 파이프라인 실배선)

이 작업은 지시받은 write set(신규 모듈 + trend-analyzer 확장)까지만이다. 실제로 `sourcing-recommender.ts`(cron 소비)에 이 렌즈 분류기를 연결해 10개 추천에 배지를 붙이고 디스코드/앱에 렌즈별로 그룹핑해 보여주는 작업(설계 §3-1·§3-4)은 **별도 로드맵 단계**로 남아있다 — `wholesale-matcher.ts`/`cron/*` 수정 금지 지시 때문에 이번 범위에서 제외됐다. 다음 라운드에서 이어서 진행 권장.

## 7. 커밋

`src/lib/sourcing-lenses.ts`(신규) + `src/lib/trend-analyzer.ts`(확장) 1개 커밋으로 처리(같은 로드맵 1b 작업 단위, write set이 서로 강하게 결합돼 있어 분리 시 리뷰 맥락만 나빠짐).
