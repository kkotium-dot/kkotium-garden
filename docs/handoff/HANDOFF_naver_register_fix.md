# HANDOFF — B-12 네이버 등록 라우트 근본 재작성 [CLOSED 2026-05-27 PM]

> **이 문서의 역할**: 2026-05-27 Desktop 세션에서 명화송풍구 등록 직전 단계까지 가서
> 발견/우회한 2개 버그(B-11 저장배관, B-12 등록 라우트 구조결함)를 Code 환경에서
> 근본 수정하기 위한 정밀 인계장.
> **상태**: ✅ CLOSED — 2026-05-27 PM Code turn 본 commit으로 B-12 + B-11 §3-1 동시 해소.
> **방향**: Desktop -> Code -> Desktop (실 발행은 대표 승인 후 별도 turn).
> **후속**: 대표 승인 후 Desktop 새 채팅에서 명화송풍구 등록 완주.

---

## [CLOSED] 본 commit 적용 변경 (2 파일 +186/-50)

### `src/app/api/naver/register/route.ts` — 전면 재작성

| # | 함정 | 적용 fix |
|---|---|---|
| 1 | `categoryMap` 의류 7종 하드코딩 + silent fallback | 폐기. `product.naverCategoryCode` 직접 사용. 빈 값/공백이면 422 차단. |
| 2 | API 실패 시 `status='registered'` + `PENDING_`/`ERROR_`/`MOCK_` 가짜 ID 주입 3곳 | 전부 제거(#46). 실패는 502 + status/naverProductId 미변경. 성공 시에만 mutate. |
| 3 | `detailContent = product.description` (텍스트만) | `buildDetailContent`로 `hookPhrase + <img src="${detail_image_url}"> + description` 조합. |
| 4 | `X-Naver-Client-Id`/`X-Naver-Client-Secret` 헤더 직접 호출 | `naverRequest('POST', '/v2/products', payload)` 위임 — OAuth2 + bcrypt 전자서명 + Bearer 토큰. |

추가 단정:
- supabase client 의존성 제거 -> `prisma` singleton 통일 (#3-2)
- 422 게이트 3종: naverCategoryCode / mainImage / salePrice
- Commerce API v2 정합: `leafCategoryId` + `images.representativeImage` + `deliveryFee.deliveryFeeType: 'PAID' | 'FREE'`

### `src/app/api/products/[id]/save-assets/route.ts` — DB UPDATE 추가

Storage 업로드 200 후 `prisma.product.update({ main_image_url?, detail_image_url? })` 자동 수행. 한쪽만 성공해도 해당 컬럼만 update(spread guard). DB update 실패는 errors 배열에 누적되되 응답 status 200 보존(부분 성공 정합).

### B-11 §3-2(studio 프론트 detailBase64 전송) 단정 — 변경 0건

`src/components/studio/useStudioActions.ts:268-271` 정독 결과 `runSave`는 `detail` state 존재 시 이미 `detailBase64 + skeletonId`를 페이로드에 동봉함. 실제 누락은 (a) `runFullSequence` autorun이 detail 카드를 *opt-in*으로 skip하는 설계, (b) manual 흐름에서 사용자가 detail 카드 실행 전에 save를 누른 경우. 본 turn은 autorun 의미 변경 보류, 라우트 측 DB UPDATE(§3-1)만 적용.

---

## 검증 (Code 측 의무 통과)

- `npx tsc --noEmit` 0 errors ✅
- `npm run build` exit 0 ✅ (`/api/naver/register` + `/api/products/[id]/save-assets` 모두 ƒ Dynamic 유지)
- sentinel grep 0 hits ✅
- `categoryMap` references: 0 (수정 후 grep) ✅
- `PENDING_`/`ERROR_`/`MOCK_` 가짜 ID 패턴: 0 (수정 후 grep) ✅
- 코드 inline 한글 주석: 0건 (영어 주석만) ✅

---

## 보류(의도적) — 실 네이버 발행

본 turn은 **코드 수정 + 빌드 + Vercel 배포까지만**. 실제 명화송풍구를 네이버 스마트스토어에 발행하는 호출은 비가역(스토어에 노출 + 광고비 발생)이므로 대표 승인 후 별도 Desktop turn에서:
1. /products?id=cmpnooli40001f0gveaxr8iim 진입
2. (선택) 썸네일/상세 보강 — main_image_url + detail_image_url 모두 살아있음으로 skip 가능
3. "네이버 직접 등록" 클릭 -> 본 commit의 새 라우트 호출
4. 응답 `success: true` + `naverProductId` 실제 값 검증
5. 스마트스토어 실 노출 + DB row `naverProductId IS NOT NULL` cross-check

---

## 후속 PENDING

| 항목 | 권고 |
|---|---|
| 첫 실 네이버 발행 검증 | 대표 승인 후 Desktop turn — 본 commit 라우트의 production 정합 단정 |
| naverRequest proxy/direct 모드 검증 | `NAVER_PROXY_URL` 미설정 시 direct 모드. Vercel ENV의 NAVER_CLIENT_ID/SECRET($ escape) 정합 점검 |
| stockQuantity 999 하드코딩 | InventorySnapshot 실 재고 연동 — 별도 sprint |
| `addressbook` 동기화 시 `shippingAddressId`/`returnAddressId` payload 동봉 | 본 commit은 미동봉(주소록 미연동 케이스 graceful). Naver가 sellerId의 기본 주소를 사용함 |
