# 결과 — 씨앗심기 정보완전성 + 부분재연동 설계 + 우측 패널 UX 4건 (2026-08-11, Code)

> 원본 지시: `docs/handoff/CODE_SEED_PLANTING_IMPROVEMENTS_HANDOFF_2026-08-11.md`
> tsc 0 · build 0 · 브라우저 실측 완료. 네이버 접촉 0(읽기 전용 로직 수정 + 문서만).

---

## #1 원산지 정보 미연동 — 근본수정 완료

**핵심 발견**: 인계 문서가 우려한 "네이버 원산지 코드체계와 앱 코드체계가 다를 수 있다"는
가정을 코드로 추적해 **틀렸음을 확인**했다.

- `src/lib/naver/naver-origin-codes.ts`의 `NAVER_ORIGIN_CODES`(원산지코드.xls 518건,
  네이버 공식표)가 **앱의 유일한 원산지 코드 소스**다.
- `src/lib/naver/product-builder.ts`의 `OFFICIAL_ORIGIN_CODES = new Set(NAVER_ORIGIN_CODES.map(o => o.code))`이
  `resolveOriginAreaCode()`(발행/수정 시 `Product.originCode` 검증에 사용되는 바로 그 함수)의
  검증 기준표다.
- 즉 **`Product.originCode`와 네이버 `detailAttribute.originAreaInfo.originAreaCode`는
  완전히 같은 코드표를 쓴다** — 변환 테이블이 필요 없고, 그대로 대입해도 안전하다.

**수정**: `src/app/api/products/import/route.ts`
- `pickOrigin(op)` 신설 — `originAreaInfo.originAreaCode`를 `NAVER_ORIGIN_CODES` 표에
  존재할 때만(`OFFICIAL_ORIGIN_CODE_SET.has`) `Product.originCode`에 채움(표에 없는 값은
  추측 저장하지 않고 스키마 default `'0001'`로 남김 — #82 정직한 미달성).
- `naver_origin`(텍스트)은 `originAreaInfo.content`(있으면) 또는 `originCodeLabel(code)`
  폴백으로 채움.
- `importer_name`도 같은 추출에서 `originAreaInfo.importer`로 함께 채움(naver-detail
  라우트와 동일 추출 경로 재사용, 스키마에 이미 존재하는 필드).
- 기존에 "코드체계가 달라 오매핑 위험"이라 적혀 있던 주석은 근거가 틀렸으므로 정정.

**검증**: tsc 0 · build 0. 실제 네이버 연동 상품으로의 import round-trip은 로컬 dev DB에
연동 후보 상품이 없어 라이브 재현은 못했다(정직 보고) — 코드 경로는 `naver-detail/
route.ts`의 기존 검증된 추출 로직과 100% 동일 패턴이라 회귀 위험은 낮음.

---

## #3 권장 판매가 → 좌측 폼 반영 — 이미 정상 작동 확인(코드 변경 없음)

인계 문서는 "적용" 버튼이 없을 수 있다고 가정했으나, `MarginCalculator.tsx`에 이미
**"적용" 버튼 + `onSalePriceChange` 배선이 존재**했다(`applyRecommendedPrice` →
`onSalePriceChange(recommendedPrice)` → `products/new/page.tsx`의
`onSalePriceChange={v => setPrice(String(v))}`).

**브라우저 실측**(로컬 dev, `/products/new`):
1. 도매가 14,300 / 판매가 29,000 / 할인 10% 입력 → 마진 27.0%, 순이익 7,043원 확인.
2. 목표 마진율 35% 기준 추천 판매가 29,700원 자동 계산 → "적용" 클릭.
3. 우측 패널 판매가 필드 29,700으로 갱신 + "목표 달성 OK" 표시 확인.
4. **좌측 "기본 정보" 탭으로 전환해 재확인 — 판매가 필드가 실제로 29,700으로 반영됨**,
   엑셀 매핑 미리보기의 "판매가 29,700원 / 할인율 10%"까지 일치.

**결론**: 요청한 기능은 이미 완전히 동작 중. 추가 구현 불필요.

---

## #4 즉시할인 인라인 배치 — 구현 완료

`src/components/products/MarginCalculator.tsx` — "가격 입력" 섹션 재구성:

- 기존: 도매가/판매가 2컬럼 그리드 → **별도 줄**에 즉시할인(원/% 세그먼트 토글 + 숫자
  입력 + 결과)이 떨어져 있어 "판매가 대비 할인"이라는 관계가 한눈에 안 들어옴(운영자 신고).
- 변경: 판매가 컬럼 안에 `판매가 입력 − 즉시할인 입력(단위 토글 버튼 내장)` 한 줄로
  인라인 배치, 바로 아래 `→ 실판매가 N원 (할인액/율 배지)` 요약을 붙임. 도매가는 기존
  위치 유지(왼쪽 컬럼).
- 세그먼트 토글(원/% 버튼 2개)은 좁은 인라인 공간에 안 맞아 클릭 1번으로 단위를
  전환하는 축약 버튼(입력창 안쪽 `원`/`%` 라벨)으로 대체 — 클램프 로직(퍼센트 0~100,
  원 ≥0)은 기존 `setDiscountUnit` 그대로 재사용해 회귀 없음.

**브라우저 실측**: "판매가 [29000] − [10 %] → 실판매가 26,100원 −2,900원" 한 줄로
정상 렌더 확인(스크린샷 기준 운영자가 예시로 든 레이아웃과 동일한 관계 표현).

---

## #2 "수정한 필드만 네이버 재연동" — 설계만 (승인 시 별도 라운드 구현)

설계 문서: `docs/design/NAVER_PARTIAL_SYNC_2026-08-11.md`

**요지**: 네이버 v2 PUT은 FULL REPLACE 확정(기존 규칙)이므로 "부분 재연동"은 부분 PUT이
아니라 "변경 필드만 사람이 읽을 수 있게 감지 → 전체 payload를 정확히 재구성 → PUT"으로
구현해야 한다. 조사 결과 **쓰기 파이프라인 자체(`/api/naver/products/update` +
`buildNaverProductPayload` + GET-merge 방어 + confirm 게이트)는 이미 존재**해서 신규
인프라가 거의 필요 없다 — 부족한 건 씨앗심기 화면의 진입점(dirty-field 감지 + "네이버에도
반영" 버튼 + 프리뷰 모달) 뿐. 상세 3단 설계(변경감지/UI/백엔드 최소변경)는 문서 참조.

코드 변경 0 · 네이버 접촉 0.

---

## 검증 요약

- `npx tsc --noEmit` → 0 errors
- `npm run build` → 0 errors, 정상 라우트 매니페스트 생성
- 브라우저 실측(로컬 dev, `/products/new`): #3·#4 동작 확인, 콘솔 신규 에러 0
  (기존 SVG hydration mismatch 경고 1건은 이번 변경과 무관한 기존 이슈 — 손대지 않음)

## write set (실제 변경분)

- `src/app/api/products/import/route.ts` — #1
- `src/components/products/MarginCalculator.tsx` — #4 (#3은 코드 변경 없음)
- `docs/design/NAVER_PARTIAL_SYNC_2026-08-11.md` — #2 설계 (신규)
- `docs/handoff/CODE_SEED_PLANTING_IMPROVEMENTS_2026-08-11.md` — 본 문서

## 다음 세션 시작 순서

1. #2 설계 문서 검토 후 승인 시 구현 착수(dirty-field tracking + UI + `/api/naver/
   products/update` 재사용 확정).
2. #1 실 네이버 연동 상품으로 import round-trip 재현 검증(로컬 DB에 연동 후보가 없어
   이번엔 코드 경로 정합성 확인까지만 완료 — 실측 기회 있을 때 1회 확인 권장).
3. 기존 대기 항목(로드맵1b 8렌즈 시스템 연결 여부, git stash `z3c-misdirected-
   changes-needs-redo` 처리, push된 미merge 브랜치 재확인)은 이번 라운드와 무관 — 그대로 대기.
