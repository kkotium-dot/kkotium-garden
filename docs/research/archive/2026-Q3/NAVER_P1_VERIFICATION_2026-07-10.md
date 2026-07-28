# 네이버 P1 심화검증 결과 (Desktop 독립검증) (2026-07-10)

Authoring: DESKTOP(Supabase MCP + 코드 실측). 계기: v6 디자인 진행 중 의존성 없는 병행작업. 권위: NAVER_STORE_OPERATIONS_UPDATE §4. 상태: A 완결·B 부분(재검증 대기).

## A. 단위가격 unitCapacity (§4-A) — ✅ 검증 완결
- **DB 4컬럼 적용 확인**: Product.unit_price_yn(bool)·unit_total_capacity(float)·unit_capacity(float)·unit_indication_unit(varchar).
- **정책 대상**(unit-price-policy.ts): D1='식품' 전체 / D1='화장품/미용' 전체 / D1='생활/건강' AND D2∈{세제·청소·화장지/티슈·위생 계열}. 그 외 not_applicable.
- **★명화 발행 안전 확인**: 명화(50014980) = D1'생활/건강'·D2'자동차용품'·'차량용방향제' → **단위가격 비대상**. §4-A 검증 게이트가 **명화 발행을 막지 않음**.
- 3상품 전부 비대상(명화=자동차용품·아이스트레이 50005257=보관용기·달항아리 50000963=인테리어) → unit 필드 null 정상·/products/new에서 단위가격 UI 미노출이 정상 동작(식품/화장품 카테고리 선택 시에만 노출).
- 미검증(저위험): 실제 식품 카테고리 선택 시 UI 필수 배지 렌더(대상 상품이 없어 실화면 트리거 불가) — 향후 식품 상품 추가 시 확인.

## B. 주문 배송추적 (dd30ea3 매핑) — ⚠️ 부분(재검증 대기)
- **스키마 존재 확인**: Order.trackingNumber·shippedAt·deliveredAt·shippingAddress/Fee/Request/Zipcode.
- **실데이터**: 주문 24건 전부 trackingNumber/shippedAt/deliveredAt = **0 (미채움)**·마지막 sync 2026-07-09 08:35.
- 판정 불가: dd30ea3 매핑이 실제로 채우는지 미확정. 원인 후보 ①배포 후 sync 미실행 ②24건이 배송정보 없는 과거/테스트 주문 ③네이버 응답 키 불일치(sendDate/deliveredDate/trackingNumber/deliveryCompany 키 상이).
- **다음 액션**: 배송정보 있는 실주문에 대해 수동 sync 1회 실행 후 4필드 채워지는지 확인. 0이면 네이버 orders 응답 raw와 매핑 키 대조(Code).

## 작업 유의사항/원칙 (재확인)
- **#45** 코드 배포 ≠ 동작 검증. DB 스키마 존재는 확인해도, 실데이터가 채워지는지는 실 파이프라인 1회 실행으로 검증. 데이터 0건일 때 "동작함/안함" 단정 금지 — 원인 후보 나열하고 재검증 조건 명시.
- 단위가격 등 카테고리 조건부 기능은 대상 카테고리 상품이 있어야 실화면 검증 가능 — 없으면 "로직 정합 확인 + 실화면 미검증"으로 정직 표기.
