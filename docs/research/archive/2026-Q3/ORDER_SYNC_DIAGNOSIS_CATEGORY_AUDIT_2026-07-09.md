# 주문 동기화 진단 + 카테고리 의존 기능 감사 (2026-07-09)

Authoring: DESKTOP(진단·실측). 구현=Code. 권위: 실측(Supabase Order 데이터 + sync 코드 + 카테고리 의존 파일). 원칙 #45/#62/#82. 비게이트(진단).
계기: 운영자 지적 ①카테고리 추천도 새 네이버/SEO/ROI에 맞게 갱신 필요 ②주문관리 연동 미흡. + 카테고리 5021 재편의 systemic 파급 감사.

================================================================
## A. 주문 동기화 진단 (근본 원인)
================================================================
sync 경로: cron/order-sync(하루 2회·48h룩백) → /api/naver/orders(3-endpoint last-changed). 매핑 필드: status·totalAmount·customerName·phone·shippingAddress·zipcode·productName·quantity·claim·refund·paymentDate.

**근본 원인 (실측):**
1. **★배송추적 미동기화(명확한 버그)** — 네이버 응답 `delivery` 객체(송장번호·택배사)가 오는데 **추출/저장 안 함**(코드 주석 `el.delivery (tracking only)` = 인지만). → 전 주문 trackingNumber·courierCompany null(배송완료도).
2. **배송/결제 타임스탬프 누락** — shippedAt·deliveredAt·paidAt 미매핑 → 배송 타임라인 공백.
3. **동기화 주기 하루 2회** — Vercel 플랜 cron 일 1회 제한(11·23 UTC). 실시간 아님.
4. **기타 정산 필드 누락** — shippingFee·discount·paymentMethod 미매핑.
5. orderNumber = productOrderId로 세팅(실 네이버 주문번호와 다를 수 있음·경미).

**수정 방향(Code):**
- (P1) `delivery` 객체 파싱 추가 → trackingNumber·courierCompany(deliveryCompany)·shippedAt·deliveredAt upsert 매핑. 네이버 delivery 필드 shape 확인(trackingNumber·deliveryCompany·deliveredDate 등) 후 매핑. 없으면 '' /null(#82 무허위).
- (P2) paidAt = paymentDate 매핑·shippingFee/paymentMethod 추가.
- (P3) 수동 동기화 버튼 UI 노출 확인(manual=1 경로 존재) — 하루 2회 한계 보완(운영자 온디맨드). 홈Mac launchd로 더 잦은 sync 고려(프록시 데몬 이미 존재).
- 검증: 재sync 후 배송완료 주문에 송장/택배사 채워지는지 실측.

================================================================
## B. 카테고리 의존 기능 감사 (5021 재편 파급·systemic #62)
================================================================
Code가 카테고리 재생성 + 큐레이션 死코드 4개 수정(110→107) 완료. 추가로 갱신/점검 필요한 의존 기능:

| 기능 | 파일 | 상태·필요 조치 |
|---|---|---|
| **카테고리 추천 엔진** | `/api/category/suggest` + `src/lib/engine/category-dna.ts`(per-code seed 예 category-dna-50014980.json) | ★운영자 요청 = SEO/ROI/영향도 가중 갱신. 새 5021 택소노미 반영 + seed 코드 생존 확인. **연구·설계 필요(§C)** |
| leaf 해석 | `category-leaf.ts` | 死코드 참조·재편 subtree 매핑 점검 |
| 디자인 프리셋 | `category-preset-map.ts`·category-preset-keywords.ko.json | 프리셋이 참조하는 카테고리명/코드 생존 확인 |
| 속성 enum | `category-attribute-enums.ts` | Code 死코드 0 확인. 신규 카테고리 enum 결손 점검 |
| 톤 매퍼 | `category-tone-mapper.ts` | 카테고리→톤 매핑 신규/재편 반영 |
| 큐레이션 | `naverCategories.ts` | Code 死코드 수정(107). 신규 유망 카테고리 추가 여지 |
| UI | CategorySelector·CategorySearch | 5021 목록 검색/선택 prod 동작 검증(재편된 의자/책상 트리) |

================================================================
## C. 카테고리 추천 SEO/ROI 고도화 (연구·설계 필요)
================================================================
운영자 요청: 추천이 "네이버 정보 + SEO + ROI + 영향도"에 맞게. 현재는 per-code seed 기반(정적). 고도화 방향(설계 후 구현):
- **SEO 신호**: 카테고리별 검색량·경쟁강도(DataLab/트렌드)·상품명 키워드 적합도.
- **ROI 신호**: 카테고리 수수료율·평균 마진·회전율.
- **영향도**: 카테고리 정확도가 노출·전환에 미치는 영향(오분류 페널티).
- 산출: 상품→후보 카테고리 랭킹(신뢰도 + SEO + ROI 종합). → Desktop 리서치 후 스펙 인계.

================================================================
## D. 우선순위
================================================================
1. **주문 배송추적 매핑 수정(A-P1)** — 명확한 버그·실사용 영향 큼. Code 즉시.
2. 카테고리 의존 기능 점검(B) — 死코드/재편 파급 확인. Code.
3. 카테고리 UI prod 검증(B) — Desktop.
4. 추천 SEO/ROI 고도화(C) — Desktop 리서치→스펙→Code(중기).

================================================================
## 작업 유의사항/원칙 (신규)
================================================================
- **#230** 외부 데이터 대규모 재편(카테고리 등) 시 파급 감사는 데이터 파일 교체에 그치지 않고 그 데이터를 소비하는 전 기능(추천·프리셋·속성·톤·큐레이션·UI)까지 systemic 점검(#62). 동기화(sync)는 "레코드 유입"뿐 아니라 "전 필드 완전성"(배송추적·타임스탬프 등)까지 검증 — 응답에 오는데 미매핑된 필드가 없는지 확인.
