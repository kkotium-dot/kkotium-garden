# 작업 인계 — import route 필드 완전성 갭 8건 (안전장치 완료 후 착수)

> **담당 레인**: Claude Code
> **작성**: Desktop, 2026-08-11
> **BASELINE**: main 최신
> **의존성**: **`CODE_PARTIAL_SYNC_SAFETY_HANDOFF_2026-08-11.md`(빈값 방어 안전장치) 완료 후 착수할 것.** 같은 파일(`import/route.ts`)이라 순서 지켜야 충돌 없음.
> **긴급도**: 안전장치보다는 낮음, 그다음 순위

---

## 1. 배경 (운영자 재확인 지시)

운영자: "네이버에서 가져온 상품 정보·이미지 모두 동기화가 돼서 유지된 채로 수정할 때도 정보가 그대로 옮겨지고, 수정한 정보만 반영이 돼서 동기화되는 시스템이 제대로 이뤄져야 한다."

Desktop이 `NAVER_FIELD_LABELS`(부분재연동이 추적하는 18개 필드, `products/new/page.tsx`)와 `import/route.ts`가 실제로 채우는 필드를 전수 대조한 결과, **18개 중 8개(44%)가 여전히 완전히 누락**돼 있음을 확인.

## 2. 갭 목록 (확정)

| 화이트리스트 필드 | import route 상태 | product-builder.ts 소스 확인 |
|---|---|---|
| detailImages | ❌ 누락 | 확인 필요 |
| detailImageUrl | ❌ 누락 | 확인 필요 |
| **hookPhrase** | ❌ 누락 | ✅ `product.hookPhrase` — payload §"detail_image_url 순서" 로직에도 쓰임(725행 부근) |
| keywords | ❌ 누락 | 확인 필요 |
| brand | ❌ 누락 | 확인 필요 |
| **asPhone** | ❌ 누락 | ✅ `product.asPhone` — `afterServiceTelephoneNumber`로 PUT(1084행), 네이버 API 응답은 `afterServiceInfo.afterServiceTelephoneNumber`(api-client.ts:844) |
| **asGuide** | ❌ 누락 | ✅ 같은 `afterServiceInfo.afterServiceGuideContent`로 추정(확인 필요) |
| sellerCode | ❌ 누락 | `sellerCodeInfo`(product-builder.ts:270) 관련 — 소스 확인 필요 |
| shippingTemplateId | ❌ 누락 | `hasShippingTemplate` 불리언 파생(916행) — 원본 필드 확인 필요 |
| unitPrice | ❌ 누락 | `unit_price_yn` 등 — 카테고리 정책 의존적(933-1045행), 신중히 확인 |

**이미 정확히 채워지는 필드(재작업 불필요)**: name, category, salePrice, mainImage, additionalImages, description, tags, originCode.

## 3. 작업 방향

1. **asPhone/asGuide부터**: 소스가 이미 확정됨(`op.detailAttribute.afterServiceInfo.afterServiceTelephoneNumber` / `.afterServiceGuideContent`로 추정 — `getProduct()` 실제 응답 구조로 재확인). `pickOrigin()`과 같은 패턴으로 `pickAfterService(op)` 헬퍼 추가.
2. **hookPhrase**: 네이버 원상품 응답에 대응하는 필드가 있는지 확인(SEO 훅문구 개념 자체가 네이버 API에 없을 수도 있음 — 이 경우 "네이버에 없는 필드는 가져올 수 없다"가 정직한 답이니 화이트리스트에서 제외하거나 항상 빈값 허용으로 표시).
3. **keywords/brand/detailImages/detailImageUrl**: 네이버 API 응답 구조(`getProduct()` 반환값)를 실제로 로그/콘솔 찍어 정확한 경로 확인 후 매핑. **추측 금지(#82)** — 실제 응답 구조 확인 없이 필드명을 짐작해서 매핑하지 말 것.
4. **sellerCode/shippingTemplateId/unitPrice**: 이건 "네이버가 가진 값을 그대로 가져오기"보다 "우리 시스템 내부 개념"에 가까울 수 있음(예: shippingTemplateId는 우리 배송 템플릿 ID이지 네이버가 주는 값이 아닐 가능성). **이 3개는 정말 네이버 응답에서 오는 게 맞는지부터 먼저 판단**하고, 아니라면 화이트리스트 정의 자체를 재검토(다른 이슈일 수 있음).

## 4. 검증 방법
- 각 필드 추가 후, 실제 네이버 상품 하나를 새로 임포트해 해당 필드가 정확히 채워지는지 DB로 확인.
- 부분재연동 dryRun 모달을 열어 "그대로 유지" 안내에 이 필드들의 정상 값이 나오는지(빈값 아닌지) 확인 — 이게 진짜 회귀 테스트.
- tsc 0 · build 0.

## 5. 전 상품 공통 관점 (필수)
이 작업의 목적은 "이 8개 필드를 채우는 것"이 아니라 **"import route가 네이버 상품의 모든 정보를 완전하게 가져오는 시스템"**을 만드는 것이다(운영자 원 요청). 따라서:
- 8개를 다 채운 뒤에도, **`NAVER_FIELD_LABELS`에 없는 다른 필드가 network 응답에 더 있는지** 한 번 훑어볼 것(예: 검색어 태그 외에 다른 SEO 메타데이터, 배송비 정보 등).
- 이미 임포트된 6개 상품(안전장치 인계 문서의 §2 규모 확인 참조)도 이번에 새로 발견한 8개 필드 기준으로 재조사 필요할 수 있음 — 안전장치 작업의 "옵션 B(백필)"와 통합해서 진행 고려.

## 완료 후
- 결과 문서: `docs/handoff/CODE_IMPORT_FIELD_COMPLETENESS_2026-08-11.md`
- tsc/build 0, 신규 임포트로 실측 검증
- 커밋·push → 채팅 인계 → Desktop 재검증
