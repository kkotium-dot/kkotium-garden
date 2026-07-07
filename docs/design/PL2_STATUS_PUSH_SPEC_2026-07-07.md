# PRODUCT-LINK PL-2 — 상태 push (품절/재판매) 스펙 (2026-07-07)

Authoring: DESKTOP. 구현=Code(코드·dry-run) / 실 push=운영자 GO. 권위: 본 문서 + PRODUCT_LINK_...RESEARCH(§1·§4) + api-client.updateStock(GET-merge full PUT) + product-link.ts. 원칙 #46/#196/#197/#181.
전제: PL-1(임포트+읽기) DONE·prod검증. **PL-2 = 첫 네이버 쓰기 단계 → GET-merge full-replace + GO 게이트 필수**.

================================================================
## 0. 범위
================================================================
- 연동 상품의 **판매상태 push**: SALE ↔ OUTOFSTOCK(품절/재판매) + 옵션 품절(optionCombinations[n].stockQuantity=0).
- ★**절대 재고수량 push 안 함**(재고=네이버 SoR·#197 — 실주문 차감 보호). 수량 절대값 세팅은 스코프 아웃.
- 제외(후속): 가격 push(PL-3)·상세/옵션 full(PL-4).

================================================================
## 1. 핵심 안전 (네이버 쓰기)
================================================================
- **full-replace(#196)**: 상태만 바꿔도 전체 payload PUT. → `updateStock`의 GET-merge 패턴 일반화 재사용(GET 최신본→상태만 교체→전체 PUT). 누락필드 삭제 방지.
- **옵션형 주의(#181)**: useStockManagement/조합형은 `originProduct.stockQuantity` 필드 제외, optionCombinations로만. getProduct로 옵션구조 확인 후 분기.
- **detailContent 생략=유지**(안전)·**seoInfo 빈값=삭제**라 항상 명시(리서치 §1.4).
- **GO 게이트(#46)**: 실 PUT은 운영자 명시 승인 + dry-run 확인 후. push 전 pull(read-before-write)로 drift 확인.
- **에코 방지**: push 후 syncHash 저장 → 다음 pull에서 동일 시 no-op.

================================================================
## 2. 구현 (Code buildable now·실 push는 GO)
================================================================
1. **api-client**: `updateProductStatus(originProductNo, targetStatus, {dryRun})` — getProduct→상태 교체→(dryRun이면 diff 반환·아니면 full PUT). updateStock 골격 재사용.
2. **route**: `POST /api/products/[id]/naver-status` `{ target:'OUTOFSTOCK'|'SALE', dryRun }` — dryRun 기본 true. 실행은 `confirm:true`+서버측 GO 로그.
3. **UI(PL-1 존3 diff 패널 활성화)**: 연동 상품 diff 패널에 [품절 처리]/[재판매] 버튼 → 클릭 시 **dry-run diff 먼저 표시**("상태만 변경·타 필드 무변경" 확인) → 운영자 확인 → PUT. 성공 시 re-GET으로 타 필드 보존 검증.
4. syncState=PENDING(push중)→SYNCED(성공)/FAILED. 부분실패 정직(#82).

================================================================
## 3. 검증
================================================================
- Code(dry-run·쓰기0): dryRun diff가 "statusType만 변경"임을 확인·옵션형 분기 확인. tsc0/build0.
- ★실 push 검증(운영자 GO): 테스트 상품 1건 SALE→OUTOFSTOCK PUT → re-GET으로 (a)상태 변경됨 (b)가격·상세·옵션 등 **타 필드 보존** 확인 → 원복(재판매). Desktop이 GO 후 수행.

================================================================
## 작업 유의사항/원칙
================================================================
- PL-2부터 네이버 쓰기 — dry-run 우선·GO 게이트·re-GET 보존검증 3중 안전.
- 재고 수량 절대 push 금지(#197) — 상태 토글만.
- full-replace라 반드시 GET-merge(#196) — 부분 PUT 금지.
