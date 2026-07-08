# PRODUCT-LINK PL-3 — 가격·재고 push (앱→네이버) (2026-07-08)

Authoring: DESKTOP. 구현=Code(dry-run·gated) / 실 push=운영자 GO. 권위: 본 문서 + PL-2(상태 push·updateProductStatus GET-merge) + RESEARCH(§1 full-replace). 원칙 #46/#196/#197/#181.
전제: PL-2(상태 push) 빌드+dry-run 검증. PL-3 = 동일 GET-merge full PUT 패턴 확장. **첫 turn = dry-run+gated UI(쓰기0)·실 push는 GO**.

================================================================
## 0. 범위 (운영자 요청①)
================================================================
- **가격 push**: 앱 salePrice → 네이버 반영.
- **재고 push**: 앱에서 입력한 재고값 → 네이버 반영(수동 명시만).
- 둘 다 GET-merge full PUT(#196)·dry-run·GO 게이트(#46).

================================================================
## 1. ★재고 SoR 정교화 (#197 갱신)
================================================================
- **자동 동기화(cron/pull)는 재고를 절대 push 안 함** — 실주문 차감분 보호(#197 유지).
- **수동 명시 push만 허용**: 운영자가 재고값을 직접 입력 + "이 재고로 반영" + GO. 경고 표시: "네이버 실재고를 덮어씁니다 — 진행 중 주문 차감분 확인".
- 도매매 드랍십 = 보통 재고 넉넉히 세팅(예 999) → 수동 push 유효 케이스.
- 옵션형(useStockManagement): originProduct.stockQuantity 제외, optionCombinations[n].stockQuantity로(#181/PL-2 동형).

================================================================
## 2. 구현
================================================================
1. **api-client**:
   - `updateProductPrice(originProductNo, newSalePrice, {dryRun})` — getProduct→salePrice 교체→(dryRun diff/PUT). 가격 외 필드 보존 검증.
   - `updateProductStock(originProductNo, newStock, {dryRun})` — getProduct→재고 교체(옵션형 분기)→(dryRun/PUT). 경고 플래그 반환.
   - updateProductStatus(PL-2) 골격 재사용.
2. **route** `POST /api/products/[id]/naver-push` `{ field:'price'|'stock', value, dryRun, confirm }` — dryRun 기본 true, 실 PUT은 dryRun:false+confirm:true+GO 로그(#46). syncState PENDING→SYNCED/FAILED.
3. **UI**(PL-1 존3 diff 패널): 가격 diff 행에 [가격 반영] · (재고 표시에) [재고 반영](경고 모달). dry-run 미리보기("가격/재고만 변경·타필드 보존") → GO 확인 → PUT → re-GET 보존검증.
4. push 성공 시 drift-scan 갱신(해당 필드 in-sync 전환) — PL-5a 연계.

================================================================
## 3. 검증
================================================================
- Code(dry-run·쓰기0): 가격/재고 dryRun diff가 "해당 필드만 변경"·옵션형 분기·타필드 보존 확인. tsc0/build0.
- ★실 push(운영자 GO): 테스트상품 가격/재고 PUT→re-GET(변경+타필드 보존)→원복. Desktop 수행.

================================================================
## 작업 유의사항/원칙
================================================================
- **#197 갱신**: 재고 = 자동 동기화 절대 미접촉(네이버 SoR) BUT 수동 명시 push는 허용(경고+GO). 자동/수동 명확 구분.
- full-replace GET-merge(#196)·re-GET 보존검증·dry-run 우선·GO 게이트 3중 안전(PL-2 동형).
- 명화 가격 drift(29,000 정합 완료)는 이미 앱=네이버 일치 → 별도 push 불요.
