# HANDOFF — G7 빈 SKU unique 제약 충돌로 DRAFT 저장 500 (SKU 미입력 상품 2번째부터 영구 저장 불가)

> **작성**: 2026-05-28 Desktop turn (Track B G2 d3 재검증 통과 후 G7 정주행 중 발견)
> **상태**: OPEN — Claude Code 처리 대기 (P0, 모든 SKU 미입력 상품 저장 차단 — 운영 치명)
> **베이스라인**: HEAD `e1c6fd6` (origin/main, Vercel READY)
> **발견 경로**: G7 88필드 DRAFT 검증 — 아이스트레이(36904429) "네이버 엑셀 다운로드" 클릭 시 POST /api/products 500
> **대표 결정 (2026-05-28)**: Fix A = SKU 자동생성 방식 확정 (null 허용 아님)

---

## 1. 증상 (production 실측, e1c6fd6)

- "네이버 엑셀 다운로드"(handleGenerate)는 2단계 동작: (1) POST /api/products (DRAFT 자동저장) -> (2) POST /api/naver/excel (엑셀 생성)
- 실측: `/api/naver/excel` **200** (엑셀 88칸 생성 정상), 그러나 선행 `/api/products` **500**
- DRAFT가 DB에 저장되지 않음 -> 엑셀은 메모리 데이터로 생성되나 영속화 실패

## 2. 근본 원인 (서버 응답 + DB 3중 교차검증으로 단정)

서버 응답:

```json
{ "success": false, "error": "Unique constraint failed on the fields: (`sku`)" }
```

DB 실측 (Supabase, project doxfizicftgtqktmtftf):
- `Product` sku 컬럼 unique 인덱스 `Product_sku_key` 존재
- `sku = ''` (빈 문자열) 행 1건 존재 (명화송풍구 cmpnooli40001f0gveaxr8iim)
- `sku IS NULL` 0건 / 전체 2행

코드 (`src/app/api/products/route.ts` POST 핸들러, line 248):

```
sku: String(data.sku || ''),
```

-> SKU 미입력 시 빈 문자열 `""`로 저장. unique 제약상 `""`도 단일 값 -> 2번째 빈 SKU INSERT 거부.

**단정**: SKU를 수동입력하지 않은 모든 신규 상품은 기존 빈 SKU 행과 충돌해 저장 100% 실패. 36904429만의 문제가 아니라 SKU 자동생성 미연결 상품 전반에 잠복 (P0).

## 3. 영향 범위 (P0)

- 새싹 셀러는 SKU를 수동 입력하지 않는 경우가 다수 -> 두 번째 상품부터 등록/저장 불가
- DRAFT 저장 자체가 막히므로 G7(88필드 영속화) 검증 진행 불가
- Track A 발행 전 반드시 닫아야 함

## 4. 근본 수정 명세 (Code)

### Fix A (핵심, 대표 승인 = 자동생성) — SKU 빈 값 시 generate-sku 엔진으로 자동 발급

파일: `src/app/api/products/route.ts` POST 핸들러 line 248

```
// 기존: sku: String(data.sku || ''),
// 변경: 빈 SKU는 generate-sku 엔진으로 자동 발급 (이미 존재하는 엔진 재사용)
const rawSku = data.sku ? String(data.sku).trim() : '';
const resolvedSku = rawSku
  ? rawSku
  : await generateUniqueSku({ platformCode, supplierAbbr, productNo }); // generate-sku 로직 위임
sku: resolvedSku,
```

- `/api/products/generate-sku` 엔진의 SKU 생성 규칙(`{PLATFORM}-{ABBR}-{번호}`) 재사용. POST 핸들러에서 import 또는 공통 lib 추출.
- 충돌 방지: 생성 후 DB 중복 체크 -> 충돌 시 suffix 증분(3-tier, generate-sku에 이미 구현된 패턴 확인).
- supplierId/productNo가 payload에 없으면 fallback 규칙 정의(예: `KKT-{timestamp}` 형식).

### Fix B (동시) — 기존 빈 SKU 행 정리

명화송풍구(cmpnooli40001f0gveaxr8iim) sku="" -> 자동생성 SKU backfill.
- Code가 SQL 준비 -> Desktop이 Supabase MCP UPDATE 실행 가능 (또는 Code 마이그레이션).
- 예: `UPDATE "Product" SET "sku" = 'DMM-HWABO-65322245' WHERE id = 'cmpnooli40001f0gveaxr8iim' AND "sku" = '';`

### Fix C (점검, G7 후속) — POST create payload 88필드 누락 점검

현 POST create는 naverCategoryCode/salePrice/originCode 등은 받으나 `sellerCode`/`options`/`optionValues`/`hasOptions`/`tags`/`keywords`/`targetKeywords`/배송 필드(shippingType/returnShippingFee/shipping_template_id 등) 다수가 create payload에 누락. G7 "88필드 완전 영속화"를 위해 create payload를 PUT 핸들러 수준으로 확장 점검 (별도 sub-commit 가능).

## 5. 검증 (Code)

- `npx tsc --noEmit` 0 / `npm run build` exit 0 / 한글 sentinel grep 0 (혁섭|쿠드|식타|릴고|헌서|위젝|스칵|쿠두)
- 재현 테스트: SKU 미입력 상품 2건 연속 저장 -> 둘 다 200/201 (충돌 0), 각 row sku 자동생성값 non-empty + unique
- push 후 `scripts/verify-vercel-deploy.sh --wait` exit 0

## 6. 검증 후 재개 동선 (Desktop, 다음 채팅)

1. 아이스트레이(36904429) "등록 시작" -> 카테고리 자동입력 (G2 [CLOSED] 회귀 0 재확인)
2. "네이버 엑셀 다운로드" -> POST /api/products **200** + DRAFT row 생성 단정
3. Supabase로 DRAFT row 88필드 매핑 검증 (naverCategoryCode=50005257 / salePrice=13900 / originCode / options / sku 자동생성값 / 배송)
4. 통과 시 본 핸드오프 [CLOSED]
5. G8(이미지 파이프라인, Sharp 무거운 합성 #26 주의) -> E1~E3(엑셀 88칸 시각검증) 정주행

## 7. 골든 픽스처 영구 보존

- 36904429(아이스트레이) = G2 [CLOSED] + G7 SKU unique 회귀 재현 표본. fix 후 회귀 테스트 케이스 보존.
- 검증 쿼리 세트(영구):
  - `POST /api/products` (SKU 미입력) -> sku 자동생성 + 저장 200 단정
  - `SELECT COUNT(*) FROM "Product" WHERE "sku" = ''` -> 0 단정 (Fix B 후)

---

## 부록 — 본 turn Desktop 실측 evidence (production e1c6fd6)

| 검증 | 결과 |
|---|---|
| POST /api/naver/excel | 200 (엑셀 88칸 생성 엔진 정상) |
| POST /api/products (엑셀 선행 저장) | 500 Unique constraint (sku) |
| POST /api/products (probe 재현) | 500 동일 에러 메시지로 근본원인 단정 (probe도 500이라 DB 무변경 = 비가역 0) |
| Supabase sku 분포 | empty_string=1, null=0, total=2, index=Product_sku_key |
