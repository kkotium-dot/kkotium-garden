# HANDOFF — G7 userId="default" Foreign Key 위반 + status/originCode 정합 (DRAFT 저장 500, SKU fix 후 잔존 P0)

> **작성**: 2026-05-28 Desktop turn (G7 재검증 — SKU fix 1aa5969 검증 중 발견)
> **상태**: [CLOSED 2026-05-28 Desktop] — 17143f0 production 재검증 통과(POST /api/products 200 + DRAFT row cmpp62yje00015xup5h8pgwx0 88필드 정합 + 다운로드 엑셀 93컬럼 41칸 정확). userId/supplierId FK 검증 fix 실효 확정. originCode 200037(6자리) 정상 = Code 무변경 판단 확정(0200037 7자리가 오염값).
> **베이스라인**: HEAD `1aa5969` (origin/main, Vercel READY — SKU fix 적용본)
> **선행 [CLOSED]**: HANDOFF_g7_sku_empty_unique (Fix A 검증 통과 — probe에 KKT-260528-E0XLYA 자동부여 확인 / Fix B 명화송풍구 sku backfill 완료 / 빈 SKU 0건)
> **발견 경로**: 36904429 등록시작 -> 엑셀 다운로드 -> POST /api/products 여전히 500. fetch 가로채기로 UI 페이로드 포착 + 동일 페이로드 재현으로 근본원인 단정.

---

## 1. 증상 (production 실측, 1aa5969)

- SKU fix 적용 후에도 "네이버 엑셀 다운로드" -> POST /api/products **여전히 500** (엑셀 200)
- 단, SKU 없이 보낸 probe(최소 페이로드)는 **200 성공** + sku 자동생성(KKT-260528-E0XLYA) -> Fix A 정상 작동 확인
- 즉 SKU는 해결됐고, UI 페이로드의 *다른 필드*가 500 유발

## 2. 근본 원인 (UI 페이로드 가로채기 + 동일 페이로드 재현으로 3중 단정)

### 2-1. 주범 — userId="default" Foreign Key 위반 (P0)

UI가 보내는 페이로드(fetch interceptor 포착):

```
userId: "default"   <- DB에 존재하지 않는 문자열 ID
status: "ACTIVE"    <- DRAFT가 아님
originCode: "200037" <- 6자리 (정상은 0200037 7자리)
```

UI 페이로드 그대로 재현 시 서버 응답:

```json
{ "success": false, "error": "Invalid `prisma.product.create()` invocation: Foreign key constraint violated: `Product_userId_fkey (index)`" }
```

**단정**: UI(`src/app/products/new/page.tsx` handleGenerate)가 userId에 리터럴 문자열 `"default"`를 전송. route.ts POST의 userId resolve 로직은 *빈 값일 때만* `prisma.user.findFirst()` fallback하고, `"default"` 같은 *유효하지 않은 비-빈 문자열*은 그대로 통과시켜 create -> 해당 ID의 User 행이 없어 FK 위반.

- 대조 증거: probe에서 userId를 *아예 보내지 않으면* route가 findFirst로 실제 유저 자동매핑 -> 200. 즉 route fallback은 빈 값만 처리, "default" 문자열은 미처리.

### 2-2. 동반 결함

| # | 필드 | UI 전송값 | 정상값 | 영향 |
|---|---|---|---|---|
| a | status | `ACTIVE` | `DRAFT` (임시저장) | "네이버 엑셀 다운로드"는 발행이 아닌 임시저장 동선인데 ACTIVE로 보냄 -> 의미 불일치 + 향후 ACTIVE 필수검증 추가 시 추가 차단 |
| b | originCode | `200037` (6자리) | `0200037` (중국 7자리, KKOTIUM_DEFAULTS) | 앞자리 0 누락 -> 네이버 원산지 코드 매칭 실패 위험 |

## 3. 영향 범위 (P0)

- PLANT `/products/new`에서 "네이버 엑셀 다운로드"(handleGenerate)로 저장하는 *모든* 상품이 500 -> 저장 100% 차단
- SKU fix(1aa5969)로 1겹은 벗겼으나 그 아래 userId 결함이 드러남 -> Track A 발행 전 필수 해소

## 4. 근본 수정 명세 (Code)

### Fix A (핵심) — route.ts userId resolve 강화 (유효하지 않은 문자열도 fallback)

파일: `src/app/api/products/route.ts` POST 핸들러 (userId resolve 블록, 기존 line ~225)

```
// 기존: let userId = data.userId || ''; if (!userId) { ... findFirst ... }
// 문제: data.userId="default"는 truthy라 findFirst를 안 타고 그대로 create -> FK 위반
// 변경: 전달된 userId가 실제 DB에 존재하는지 검증, 없으면 findFirst fallback
let userId = '';
if (data.userId && data.userId !== 'default') {
  const exists = await prisma.user.findUnique({ where: { id: String(data.userId) }, select: { id: true } });
  if (exists) userId = exists.id;
}
if (!userId) {
  const defaultUser = await prisma.user.findFirst();
  userId = defaultUser?.id ?? '';
}
// (supplierId도 동일 패턴 점검 권고: data.supplierId가 존재하지 않는 ID일 때 FK 위반 가능)
```

### Fix B — UI가 userId="default"를 보내지 않도록 정리 (page.tsx)

파일: `src/app/products/new/page.tsx` handleGenerate (POST body 빌드 지점)

- `userId: 'default'` 하드코딩 제거 -> userId 필드 *미전송*(route가 findFirst fallback) 또는 실제 세션 유저 ID 전달.
- 동시에 `status: 'ACTIVE'` -> `status: 'DRAFT'` (엑셀 다운로드는 임시저장 동선, 발행 아님).
- `originCode` 6자리 -> KKOTIUM_DEFAULTS.originCode(`0200037`) 사용 또는 0-padding 보정.

### Fix C (점검) — supplierId FK 동일 위험

route.ts supplierId resolve도 userId와 동일하게 *유효성 검증 후 fallback* 패턴 적용 (winner3333 미등록 케이스에서 잘못된 supplierId 전달 시 FK 위반 가능).

## 5. 검증 (Code)

- `npx tsc --noEmit` 0 / `npm run build` exit 0 / 한글 sentinel grep 0
- 재현: userId="default" + status=ACTIVE 페이로드 POST -> 200 (route가 실제 유저로 교정 + DRAFT 저장)
- push 후 `scripts/verify-vercel-deploy.sh --wait` exit 0

## 6. 검증 후 재개 동선 (Desktop, 다음 채팅)

1. 36904429 등록시작 -> 소분류 보관/밀폐용기 -> 카테고리코드 50005257
2. "네이버 엑셀 다운로드" -> POST /api/products **200** + DRAFT row 생성
3. Supabase로 88필드 매핑 검증 (userId 실제값 / status=DRAFT / sku 자동생성 / naverCategoryCode=50005257 / salePrice=13900 / originCode=0200037)
4. 통과 시 본 핸드오프 + HANDOFF_g7_sku_empty_unique [CLOSED]
5. G8(이미지, Sharp #26 주의) -> E1~E3(엑셀 88칸 시각검증)

## 7. 본 turn Desktop 실측 evidence (production 1aa5969)

| 검증 | 결과 |
|---|---|
| Fix B backfill (명화송풍구 sku) | DMM-DIRECT-65322245, 빈 SKU 0건 |
| probe (userId 미전송) | 200 + sku 자동생성 KKT-260528-E0XLYA + naverCategoryCode 50005257 정상 |
| UI 페이로드 (userId="default") | 500 Foreign key constraint Product_userId_fkey |
| UI 페이로드 status | "ACTIVE" (DRAFT 아님) |
| UI 페이로드 originCode | "200037" (6자리, 0 누락) |
| production 정리 | probe 상품 즉시 DELETE -> DRAFT 정상 2건만 잔존 (비가역 0) |
