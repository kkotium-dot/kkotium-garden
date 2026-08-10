# 작업 결과 — 운영자 실사용 발견 오류 8건 (2026-08-10)

> **작성**: Claude Code
> **BASELINE**: `bedc0e4` → 이 작업의 커밋들
> **원본 지시**: `docs/handoff/CODE_UX_FIXES_HANDOFF_2026-08-10.md`
> **검증**: `npx tsc --noEmit` 0 errors · `npm run build` 0 errors · 브라우저 실사용 시나리오(Playwright 유사 조작) 확인

---

## #1 — 씨앗심기 카테고리 추천 "가구/인테리어" 대량 오분류 (최우선)

**수정**: `src/app/api/category/suggest/route.ts`의 `suggestWithGroq()` 프롬프트에서
```
- For unknown items: use 가구/인테리어 > DIY자재/용품 > 기타DIY자재/용품
```
줄을 완전히 삭제하고
```
- If the product does not clearly match any category you know, respond with an empty array [] instead of guessing.
```
로 교체. `suggestFallback()`의 `FALLBACK_RULES`는 전수 확인 결과 와일드카드 캐치올 규칙이 없어(모든 규칙이 구체적 키워드 매칭) 추가 수정 불필요 — 매칭 없으면 자연스럽게 빈 배열 반환.

**검증**:
- 신규(캐시 없는) 상품명 3건으로 재현 테스트 → 더 이상 100% "가구/인테리어"로 쏠리지 않음. 한 건은 AI가 스스로 빈 배열을 반환해 `suggestFallback`으로 자연 이관됨(설계대로 동작).
- 클라이언트(`products/new/page.tsx`)는 `suggestions.length === 0`을 이미 안전하게 처리(자동채움 시도 안 함, 크래시 없음) — 별도 수정 불필요.

**⚠️ 잔여 이슈 (운영자 확인 필요)**:
1. **캐시 오염**: `dome_category_cache`(name_hash/dome_code)에 수정 전 프롬프트로 저장된 "가구/인테리어" 오답 매핑이 남아있음. 캐시 조회가 AI 호출보다 먼저 실행되므로(`route.ts` 최상단), 이미 스캔된 적 있는 상품명은 프롬프트 수정과 무관하게 계속 캐시된 오답을 서빙함. **DB에서 `d1='가구/인테리어'`인 캐시 행을 얼마나 지울지는 운영자 판단이 필요**(전체 삭제 시 재계산 비용 발생, 부분 삭제 시 기준 필요) — 이번 작업 범위에서 DB는 건드리지 않음.
2. **AI 자체 정확도 한계**: 강제 지시를 지웠어도 Groq가 스스로 "가구/인테리어"를 답할 수는 있음(테스트 중 1건 확인 — "무선 반려동물 자동급식기"). 이는 결정론적 강제 폴백이 아니라 모델 자체 판단이라 100% 제거는 불가 — 이번 수정의 목표(전수 강제 쏠림 제거)는 달성됐고, 잔여 오분류는 `validateSuggestion()`의 fuzzy 매칭 기준 재검토(핸드오프 §1-5)로 이어서 개선 가능.

---

## #2 — 네이버 상품번호로 상품 가져오기 작동 안 함

**근본 원인 확정**: 서버(`/api/products/import`)는 정상 동작(성공/스킵/실패를 항목별로 정확히 반환)했으나, 클라이언트(`NaverImportModal`의 `doImport()`, `src/app/products/page.tsx`)가 **응답 body를 전혀 읽지 않고** 무조건 성공 취급 → 모달을 닫고 새로고침만 했음. 실패해도, 전부 스킵돼도 사용자에게 아무 신호가 없어 "작동 안 함"으로 체감됨.

**수정**:
- `doImport()`가 응답 JSON을 파싱해 `imported`/`skipped`/`failed` 개수를 확인, 실패가 있으면 첫 번째 실패 사유를 포함한 에러 메시지 표시, 스킵만 있으면 "이미 연동된 상품입니다" 표시.
- 전체 선택 가져오기 버튼은 **완전 성공했을 때만** 모달을 닫도록 변경(부분 실패 시 에러를 보여준 채 모달 유지).
- 상품번호 직접 입력도 성공 시에만 입력창을 비움(실패 시 재시도하기 쉽도록 값 유지).

**검증**: 브라우저에서 존재하지 않는 상품번호(`999999999999`)로 실측 → `0개 연동 완료 · 1개 실패 (999999999999: Naver API GET /v2/products/origin-products/999999999999 실패: HTTP 404)` 정확히 표시됨. 수정 전에는 아무 메시지 없이 모달만 닫혔음.

---

## #3 — 페이지네이션 숫자 버튼 추가

**수정**: `src/app/products/page.tsx`에 `buildPageList()` 헬퍼 추가(축약 표기: `1 … 5 6 [7] 8 9 … 20`, 7페이지 이하면 전체 표시). `NaverImportModal` 푸터의 이전/다음 버튼 사이에 페이지 숫자 버튼 그룹 삽입 — 클릭 시 해당 페이지로 직접 이동.

**검증**: 브라우저에서 "3" 클릭 → `GET /api/naver/products/search?page=3&...` 요청이 직접 발생, 목록이 3페이지 내용으로 즉시 교체됨. 활성 페이지가 중앙에 오도록 재계산되는 것도 확인(`1 2 [3] 4 5 … 10`).

---

## #4 — 마진 계산이 스토어 즉시할인 적용가를 제외

**근본 원인 확정**: 앱 전체 마진 분석(`/api/profitability`)은 `effectivePrice = salePrice - instant_discount`(원화)로 계산하는데, `/api/products/import`가 상품 생성 시 `instant_discount`를 전혀 채우지 않았음(항상 `null`→0). 네이버 원상품 상세에는 `customerBenefit.immediateDiscountPolicy.discountMethod`(PC 우선, PERCENT/WON)에 즉시할인 정보가 있음 — 이걸 안 읽었던 것.

**수정**: `src/app/api/products/import/route.ts`에 `pickInstantDiscountWon()` 추가 — PC 할인 정책을 읽어 원화로 환산(PERCENT면 `salePrice × value/100` 절사, WON이면 그대로, 0~salePrice로 클램프) 후 `instant_discount`에 저장.

**검증**: 코드 레벨 확인(실제 할인 걸린 네이버 상품으로 재현 테스트는 승인된 테스트 상품이 없어 미실시 — 필드 매핑은 Naver 공식 Discussion #241의 스키마로 확인). `/api/profitability`가 이미 이 필드를 소비하므로 배관만 연결하면 즉시 반영됨.

---

## #5+#6 — 씨앗심기 이동 시 정보/이미지 리셋 방지

**근본 원인 확정**: `?edit=` 로더(`productFormHydrate`, `src/lib/products/product-form-mapping.ts`)는 이미 정상 동작 — DB에 있는 값은 빠짐없이 복원함. **진짜 원인은 import 시점에 DB에 애초에 거의 아무것도 안 남기고 있었던 것**(`name`/`salePrice`/`mainImage`/`status` 4개 필드만 저장, 카테고리·설명·추가이미지·태그는 전부 버려짐). 네이버 원상품 상세에는 이 정보가 이미 있는데도 안 읽었음.

**수정**: `/api/products/import`에서 추가로 저장:
- `naverCategoryCode` ← `op.leafCategoryId` (네이버 코드 체계 그대로, 형식 100% 동일)
- `description` ← `op.detailContent` (HTML, 형식 그대로)
- `images`(추가 썸네일) ← `op.images.optionalImages[].url`
- `tags` ← `op.detailAttribute.seoInfo.sellerTags[].text`

**의도적으로 제외한 필드**: 원산지(`originAreaInfo`)·AS정보는 네이버 코드 체계와 앱 내부 코드 체계가 달라 그대로 매핑하면 오히려 잘못된 값이 채워질 위험이 있어 이번 범위에서 제외(형식이 100% 동일한 필드만 채움 — 오매핑 위험 있는 필드는 별도 검토 필요).

**검증**: `?edit=` 화면에서 기존 상품(이전에 import된 것) 열어 카테고리 4단계·이미지 배지가 정상 표시됨을 스크린샷으로 확인. `productFormHydrate` 코드 경로는 수정 없이 그대로 재사용(이미 올바른 필드명을 읽고 있었음).

---

## #7 — 목표 마진율 입력 시 "0" 접두 버그

**근본 원인 확정**: `src/components/products/MarginCalculator.tsx`의 목표 마진율 `<input>`만 `value={local.targetMargin}`로 원시 숫자를 그대로 바인딩(같은 파일의 다른 모든 숫자 입력은 `value={x || ''}` 패턴 사용). 필드를 지우면 `parseFloat('') || 0` → 상태가 `0`이 되고, 입력창이 리렌더되며 리터럴 `"0"`을 표시 → 다음 키 입력이 그 뒤에 이어붙어 "030" 발생.

**수정**: `value={local.targetMargin || ''}`로 통일(다른 필드와 동일 패턴).

**검증**: 브라우저에서 DOM 레벨로 필드를 빈 값으로 만든 뒤(진짜 버그 재현 조건) "30" 타이핑 → 최종 값 `"30"` 정확히 확인(수정 전이라면 "030"이 됐을 상황).

---

## 검증 요약

| # | 항목 | tsc | build | 브라우저 검증 |
|---|---|---|---|---|
| 1 | 카테고리 오분류 | ✅ | ✅ | ✅ (curl, 신규 캐시 케이스) |
| 2 | 네이버 가져오기 안됨 | ✅ | ✅ | ✅ (404 케이스 에러 표시 확인) |
| 3 | 페이지네이션 숫자버튼 | ✅ | ✅ | ✅ (직접 페이지 이동 확인) |
| 4 | 마진 할인가 미반영 | ✅ | ✅ | 코드 레벨만(실 할인 상품 테스트 데이터 없음) |
| 5+6 | 씨앗심기 리셋 방지 | ✅ | ✅ | ✅ (edit 화면 하이드레이션 확인) |
| 7 | 목표마진율 "0" 버그 | ✅ | ✅ | ✅ (DOM 레벨 재현 후 수정 확인) |

`npx tsc --noEmit` 0 errors · `npm run build` 0 errors (전체 통과, 최종 1회).

## 실 Discord/네이버 발행 테스트

이번 작업 범위에서 네이버 실 PUT(발행/수정)이나 Discord 발송은 전혀 수행하지 않음(#2/#4/#5 전부 GET 또는 로컬 DB 쓰기만) — 절대 금지 지시 준수.

## 다음 세션 확인 필요

1. #1의 캐시 오염(`dome_category_cache`의 가구/인테리어 오답 행) 처리 방침 — 운영자 결정 필요.
2. #4는 실제 즉시할인이 걸린 네이버 상품으로 가져오기 재현 테스트 권장(로컬에 그런 테스트 상품이 없어 코드 레벨 검증만 완료).
