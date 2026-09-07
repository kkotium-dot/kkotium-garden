# 역import 상품 데이터 결손 계열 — supplier_code + naverCategoryCode (2026-09-06, Desktop)

> 발견 경위: 디스코드 확장 개선들이 데이터 부재로 막히는 근본원인을 추적하다,
> 발행 6개가 전부 네이버 역import(source=IMPORTED, origin_kind=APP_CREATED)
> 상품이고, 초기 import route가 여러 필수 필드를 안 채운 채 임포트한 것을
> 실측 확인. 방어는 있으나 능동 백필 개입점이 없는 "쌍둥이 패턴".

## 전수 실측 (발행 6개 필드 결손)
| 상품 | naverCategoryCode | supplier_product_code | seller_product_code | originCode | salePrice |
|---|---|---|---|---|---|
| 접이식트렁크 | ✅ | ❌ | ❌ | ✅ | ✅ |
| 듀얼무선가습기 | ❌ | ❌ | ❌ | ✅ | ✅ |
| 저소음물멍가습기 | ❌ | ❌ | ❌ | ✅ | ✅ |
| LED차량가습기 | ❌ | ❌ | ❌ | ✅ | ✅ |
| 슬림불멍가습기 | ❌ | ❌ | ❌ | ✅ | ✅ |
| 플라티코화분 | ❌ | ❌ | ❌ | ✅ | ✅ |

→ **naverCategoryCode 5/6 공백, supplier/seller_product_code 6/6 공백.**
originCode·salePrice는 온전(방어 대상 아니었거나 채워짐).

## 이미 있는 방어 (덮어쓰기 사고 방지, 능동 채움 아님)
naver/products/update/route.ts applyNaverStateDefense (2026-08-12):
- 앱 DB가 비어도 PUT 전 네이버 GET-merge로 실제값 보존, leafCategoryId
  유효하지 않으면 PUT 하드블록. → 빈 값으로 네이버 실제 카테고리를
  덮어쓰는 사고는 방지됨(검증 필요하나 로직 존재).
- **한계**: 이건 "수정/재발행 시 사고 방지"일 뿐, 앱 DB의 공백을 능동적으로
  채우지는 않음. 그래서 카테고리 정합성검사·deep-link·disposition 등
  카테고리/코드 의존 개선들이 이 5~6개 상품엔 여전히 작동 못함.

## 두 갈래 결손 (같은 근본원인: 역import 미충전)
### A. supplier_product_code (6/6 공백) — 재고폴링 죽음
= DISPOSITION_SNAPSHOT_ABSENCE §근본병목. 폴링/알림/센터/disposition
재고추적 전체 마비. 백엔드(api/products/[id]/supplier-code)+자동매칭 완비,
UI 개입점만 부재. Code 진행중(supplier-code UI).

### B. naverCategoryCode (5/6 공백) — 카테고리 의존 기능 마비
네이버엔 실제 카테고리가 있으나(발행돼 판매중이므로) 앱 DB만 공백.
백필 인프라: getProduct(네이버 GET, api-client.ts:862) 존재. 그러나
naverCategoryCode 공백을 GET으로 채우는 전용 백필 개입점 없음
(category-id-resolver는 category_id 내부참조용, 다른 층위).

## Code 인계 (B: naverCategoryCode 백필)
```
목표: 발행됐으나 naverCategoryCode 공백인 상품을, 네이버 GET(getProduct)으로
 실제 카테고리를 가져와 DB에 채우는 백필. A(supplier-code)와 독립.

방식(운영자 개입점, #62 전상품공통):
1) 대상 감지: "naverProductId 있음 + naverCategoryCode 공백" 상품에
   "카테고리 정보 없음 — 네이버에서 가져오기" 배지/버튼(꽃밭돌보기 또는
   상세드로어). supplier-code UI와 같은 자리에 자연스럽게 병렬 노출.
2) 동작: getProduct(naverProductId) → originProduct.leafCategoryId 추출 →
   유효(6~10자리 숫자)하면 prisma로 naverCategoryCode 채움. 실패/무효면
   정직 표시("네이버에서 못 가져옴, 수동 확인 필요") — 억지로 안 채움(#231).
3) 채운 뒤: 카테고리 정합성검사·deep-link·disposition이 이 상품에도 작동.
검증: 공백 5개 중 1개로 백필→DB반영→정합성검사 통과 확인(Desktop 실측).
 네이버 GET 실패 시 하드블록(빈 값 저장 금지).

[의존성] A(supplier-code)와 독립, 병렬 가능. 같은 UI 자리(데이터 결손
 상품 배지)에 A/B 배지를 통합하면 개입점 UX 일관(권장).
```

## 통합 제안 — "재연동 필요" 개입점 하나로
A(재고추적 연결)·B(카테고리 가져오기) 둘 다 "역import로 데이터 결손된
상품"의 복구 액션. 상품 카드/드로어에 **"⚠️ 재연동 필요"** 단일 배지로
묶고, 클릭 시 결손 항목(카테고리/공급코드)별 복구 버튼을 한 패널에 노출하면:
- 운영자가 "이 상품 뭔가 덜 됐네"를 한눈에(ADHD 친화)
- 전상품공통 엔진(결손 필드 스캔 → 배지 → 복구액션)으로 향후 다른 결손
  필드도 같은 틀에 추가 가능(#62). 개선1의 "맥락 배너"와 같은 개입점 철학.
