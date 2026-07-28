---
paths:
  - "src/lib/naver/**"
  - "src/app/api/products/**/naver*/**"
---

# 네이버 v2 상품 수정 — 전체 페이로드 교체 필수

> 이관 출처: CLAUDE.md §3-7 (2026-06-06 명문화). 전문 보존: `docs/archive/CLAUDE_MD_FULL_2026-07-24.md`.
> 이관 근거: `docs/design/CLAUDE_MD_REDUCTION_CANDIDATES_2026-07-28.md` 후보#3(수정판).
> CLAUDE.md에는 아래 2줄 요약이 항상 로드 상태로 잔류함(§16 절대삭제금지 — 비가역 쓰기 금지 #46):
> "네이버 v2 PUT은 항상 전체 payload(부분 PUT 절대 금지). 실 쓰기는 confirm:true && !dryRun에서만."

## 상세 규칙

- **PUT `/v2/products/origin-products/{no}`는 FULL REPLACE** — 요청 body에서 누락된 필드는 네이버 상품에서 **제거**됨 (commerce-api discussion #1650). 따라서 부분 PUT(`{originProduct:{stockQuantity}}` 등) 절대 금지 → 상품명/가격/이미지/옵션/원산지/상세가 통째로 소실.
- **재고 수정도 예외 아님**: `updateStock`/`setProductOutOfStock`/`bulkUpdateStock`은 GET-merge 경로 사용 — `GET origin-products/{no}`로 현재 전체 상태 read → stockQuantity만 덮어쓰기 → 전체 payload PUT. (2026-06-06 `api-client.ts` 교정 완료. 이전엔 재고만 보내는 부분 PUT이라 listing 전파괴 위험이었음.)
- **신규 발행 외 모든 수정 경로는** DB 재구성(`buildNaverProductPayload`, register/update 라우트) 또는 GET-merge(재고 전용) 중 하나로 **반드시 전체 payload**를 구성할 것. 부분 PUT 코드를 추가하지 말 것.
- **비가역 가드**: 실 PUT은 `confirm:true && !dryRun`에서만. 라이브러리 함수(`updateStock` 등)는 `{dryRun:true}` 옵션으로 GET-merge 결과만 미리보기 가능(PUT 미실행).

핵심 파일: `src/lib/naver/api-client.ts` (`naverRequest`), `src/lib/naver/naver-categories-full.ts`, `src/lib/naver/naver-origin-codes.ts`.
