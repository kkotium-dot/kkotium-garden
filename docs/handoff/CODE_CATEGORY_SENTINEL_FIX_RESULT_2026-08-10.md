# 결과 — "가구다리(50003307)" 미분류 센티널 충돌 근본수정 (2026-08-11)

> **담당**: Code
> **인계 원본**: `docs/handoff/CODE_CATEGORY_SENTINEL_FIX_HANDOFF_2026-08-10.md`
> **BASELINE**: main `ef1e712`
> **write set**: 카테고리 센티널 13곳 + `prisma/schema.prisma` + DB 마이그레이션(5행) — 옵션 A 적용. 부록 A-2(순마진 왜곡 경고)도 함께 완료. A-1("동기화 아이콘")은 이전 세션(`932e57f`, #334-A1)에 이미 완전 제거로 해소돼 이번 세션에서는 재확인만 함.

---

## §1 카테고리 센티널 충돌 — 옵션 A 적용 완료

### DB 실측으로 근본원인 재확인

`Product.naverCategoryCode`(prisma/schema.prisma:178)가 **`String @default("50003307")`** — NOT NULL 컬럼에 센티널 값 자체가 스키마 기본값으로 박혀 있었다. 오염된 5건을 직접 조회한 결과 **전부 `source: 'IMPORTED'`, `category: null`**이었다 — 네이버 가져오기(`/api/products/import`)가 `naverCategoryCode`를 명시하지 않고 저장해 DB 기본값이 그대로 들어간 것. 인계문서의 진단(센티널=카테고리 사전 값 충돌)이 정확했고, DB 스키마 레벨에서도 같은 값이 기본값으로 새고 있었음을 추가로 확인했다.

### 13곳 교체 (센티널 `'50003307'` → `''`)

| 파일 | 처리 |
|---|---|
| `src/app/products/page.tsx` (169·1299·1411) | `=== '50003307'` → `=== ''` |
| `src/app/api/products/clone/route.ts:43` | `?? '50003307'` → `?? ''` |
| `src/app/api/crawl/batch-register/route.ts:86` | `\|\| '50003307'` → `\|\| ''` |
| `src/app/api/upload-readiness/auto-fill/route.ts:286` | `code === '50003307'` — `!code`만으로 이미 충분해 조건 단순화(`code === ''`는 중복) |
| `src/app/api/seo/name-diagnosis/route.ts:43` | `code !== '50003307'` — 같은 이유로 `if (code)`로 단순화 |
| `src/components/naver-seo/NaverSeoProductTable.tsx:70` | `DEFAULT_CATEGORY = '50003307'` → `''` |
| `src/components/dashboard/DailyPlanWidget.tsx:66` | `!== '50003307'` → `!== ''` |
| `src/lib/daily-slots.ts:230` | 동일 패턴 |
| `src/lib/seo.ts:6` | `DEFAULT_CATEGORY_CODE = '50003307'` → `''` |
| `src/lib/upload-readiness.ts:92,95` | 주석 정정 + `!== '50003307'` 조건 제거(길이체크만으로 충분) |
| `prisma/schema.prisma:178` | `@default("50003307")` → `@default("")` |

### 2곳 유지 (실제 카테고리 사전 정의)
- `src/lib/naverCategories.ts:100`
- `src/lib/naver/naver-categories-full.ts:17`

### 범위 밖으로 확인 후 미변경 — `src/lib/naver/codes.ts:34`
`FLOWER_CATEGORY_CODES`(naver-settings 화면 전용 레거시 배열)가 같은 코드 `50003307`을 **"식물 > 관엽식물"**이라는 또 다른 값으로 정의하고 있다. 이건 센티널 충돌이 아니라 **두 사전이 같은 코드를 다르게 정의하는 별개의 데이터 불일치**이며, 인계문서도 "이 버그와 직접 무관"으로 명시했다 — 손대지 않았다. 다른 화면(네이버 설정)에 영향을 줄 수 있어 별도 조사·결정이 필요한 항목으로 남긴다.

### 추가 발견 — `src/lib/kkotti-naver/evaluate.ts:209`의 하드코딩 스텁

`evaluateNaver()`의 `autoFilled.category`가 **모든 상품에 대해 무조건** `{code:'50003307', name:'가구/인테리어 > DIY자재/용품 > 가구부속품 > 가구다리', confidence:0.85}`를 반환하는 완전한 목업이었다("자동 채움 (AI 분석)"이라는 주석과 달리 실제 AI 분석 없음). grep으로 소비처를 확인한 결과 **이 필드를 렌더링하는 화면이 현재 0곳**이라 이번 버그(씨앗심기 편집화면 자동채움)의 직접 원인은 아니었지만, 같은 하드코딩 패턴이라 함께 정리했다 — `code`는 빈 문자열, `name`은 상품 자체의 `category` 문자열(없으면 "미분류"), `confidence`는 0(실제 계산 아님을 정직하게 표시)으로 교체.

### DB 마이그레이션 (실행 완료)
```sql
ALTER TABLE "Product" ALTER COLUMN "naverCategoryCode" SET DEFAULT '';
UPDATE "Product" SET "naverCategoryCode" = '' WHERE "naverCategoryCode" = '50003307';
```
- 컬럼 기본값 변경 확인(`information_schema.columns` 재조회로 `''::text` 확인)
- 5건 UPDATE 확인, `SELECT COUNT(*) WHERE naverCategoryCode='50003307'` → **0건**
- Supabase MCP가 이번 세션에 인증 불가 상태라 Prisma(`$executeRawUnsafe`, 로컬 `DATABASE_URL`이 이미 prod Supabase를 직결)로 동일한 SQL을 직접 실행 — 대상 5건 사전 확인 후 실행, 삭제 아닌 값 교체만이라 가역적.

### 검증
- `grep -rn "50003307" src/` → **3곳만 남음**: 사전 정의 2곳(`naverCategories.ts`·`naver-categories-full.ts`) + 범위 밖 레거시 1곳(`naver/codes.ts`, 위 설명) + 주석 1줄(evaluate.ts, 값 아님). **13곳 전부 교체 확인.**
- `npx tsc --noEmit` 0 · `npm run build` 0.
- **브라우저 재현 검증**(로컬 dev, prod와 동일 DB): `?edit=cmsk23ahi0007vzjezafjys06`(LED 차량용가습기, 운영자가 재현했던 그 상품) → 대분류/중분류/소분류 전부 **"선택" 플레이스홀더로 비어있음**, "가구다리" 자동채움 완전 소멸(스크린샷 확인).

---

## §2 부록 A-1 — "동기화 아이콘" (재확인만, 이미 해소됨)

`src/app/products/page.tsx` 코드 확인 결과 이전 세션(커밋 `932e57f`, #334-A1, 2026-08-10)에서 이미 해당 버튼(`toggleStatus` 단축 아이콘)을 **완전 제거**했다(confirm 게이트 추가가 아니라 버튼 자체 삭제 — 더 근본적인 해결). 코드 주석(`#334-A1(2026-08-10): toggleStatus(구 "동기화 아이콘" 단축버튼)는 두 호출부... 버튼(toggleStatus) 제거. confirm 게이트 없이 클릭 한 번에...`)으로 확인. 이번 세션에서 추가 조치 불필요.

---

## §3 부록 A-2 — 네이버 가져오기 순마진 왜곡 경고 배지 추가 완료

### 근본원인 (인계문서 그대로 재확인)
`src/app/api/products/import/route.ts:155` — `supplierPrice: 0, // unknown for an imported listing (no cost basis)`. 네이버 API는 판매가만 주고 매입원가는 모른다 — 데이터 소스의 근본적 한계(버그 아님). 이 상태로 마진%를 그대로 계산하면 원가 0원 기준으로 사실상 100%에 가까운 왜곡값이 나온다.

### 수정 — `supplierPrice === 0 && source === 'IMPORTED'`일 때 "공급가 미입력" 배지로 대체
- `src/app/api/products/route.ts`: 목록 API `select`에 `source: true` 추가(기존 미노출 필드).
- `src/app/products/page.tsx`:
  - `Product` 인터페이스에 `source?: string` 추가.
  - **`MarginCell`**(목록 행): 조건 충족 시 마진% 대신 "공급가 미입력" 표시(주황 톤, danger 빨강과 시각적으로 구분).
  - **`SidePanel` "가격" 섹션**: 동일 조건에서 마진율/순마진율 행 대신 "공급가 미입력 — 마진 계산 불가 (네이버 가져오기는 원가 정보가 없어요)" 안내문 표시, 공급가 행도 "미입력"으로 정직하게 표기(0원 대신).
  - **모바일 카드 뷰**의 마진 배지도 동일 조건 분기 추가(3곳 전부 일관).
- 조건이 거짓이면(공급가를 수동 입력했거나 NATIVE 상품) 기존 마진% 표시 그대로 — 회귀 없음.

### 검증
- `npx tsc --noEmit` 0 · `npm run build` 0.
- 브라우저 실측(`/products` 목록, prod와 동일 DB): 오염 5건 중 **공급가가 아직 0원인 4건**은 "공급가 미입력"으로 정직하게 표시됨을 확인. 나머지 1건("듀얼 무선 가습기...")은 운영자가 이미 공급가(12,900원)를 입력해둔 상태라 **정상적으로 마진 36.7%가 계산되어 표시**됨을 확인 — 조건이 정확히 공급가 유무로만 분기하고 있음을 실측으로 증명.

---

## §4 검증 게이트 종합
- `npx tsc --noEmit` → 0 errors
- `npm run build` → 0 errors
- `grep -rn "50003307" src/` → 사전 정의 2곳 + 범위 밖 레거시 1곳만 잔존(의도대로)
- DB: 오염 5건 → 0건, 컬럼 기본값 `''`로 변경 확인
- 브라우저 재현 검증: 재현됐던 정확한 상품(`cmsk23ahi0007vzjezafjys06`)으로 카테고리 빈 상태 확인 + 순마진 배지 조건부 렌더 확인

## §5 다음 단계
1. Desktop이 **프로덕션**에서 같은 상품(`?edit=cmsk23ahi0007vzjezafjys06`)으로 재검증(로컬 dev는 이미 prod DB 직결이라 결과는 동일할 것으로 예상되나, prod 배포·캐시 경로까지 확인 필요).
2. `src/lib/naver/codes.ts`의 `FLOWER_CATEGORY_CODES` 데이터 불일치(50003307 = "식물 > 관엽식물")는 이번 범위 밖으로 남겨둠 — naver-settings 화면 영향 여부 별도 조사 필요.
