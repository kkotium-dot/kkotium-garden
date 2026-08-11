# 결과 — import route 필드 완전성 갭 10건 (부분재연동 안전장치 완료 후 착수)

> **담당**: Code, 2026-08-12
> **인계 원본**: `docs/handoff/CODE_IMPORT_FIELD_COMPLETENESS_HANDOFF_2026-08-11.md`
> **순서**: `CODE_PARTIAL_SYNC_SAFETY_HANDOFF_2026-08-11.md`(커밋 `627960f`) 완료 후 착수 — 같은 파일(`import/route.ts`) 충돌 없음.

---

## 1. 전수 판정 (추측 없이 실제 `getProduct()` 응답으로 확인)

발행된 6개 상품 전부(`11431754371`/`11431754376`/`10363720011`/`11431754373`/`10523253208`/`11431754363`)를 실제로 GET해 구조를 직접 확인했다(인계문서가 지정한 방법 그대로 — 추측 금지 #82).

| 화이트리스트 필드 | 판정 | 근거 |
|---|---|---|
| **asPhone** | ✅ 매핑 완료 | `detailAttribute.afterServiceInfo.afterServiceTelephoneNumber` — 6개 전부 실측 확인 |
| **asGuide** | ✅ 매핑 완료 | `detailAttribute.afterServiceInfo.afterServiceGuideContent` — 6개 전부 실측 확인. `Product.asInfo` 컬럼에 저장(#150 별칭, `productFormHydrate`가 이미 이렇게 읽음) |
| **brand** | ✅ 매핑 완료 | `detailAttribute.naverShoppingSearchInfo.brandName` — 6개 전부 실측 확인. `Product.naver_brand`에 저장(다른 `naver_*` 접두 컬럼과 동일 규약) |
| **sellerCode** | ✅ 매핑 완료 | `detailAttribute.sellerCodeInfo.sellerManagementCode` — 6개 전부 실측 확인. `Product.sellerProductCode`에 저장 |
| **unitPrice**(4필드) | ✅ 매핑 구현(실측 예시 없음) | `detailAttribute.unitPriceInfo.{unitPriceYn,totalCapacityValue,unitCapacity,indicationUnit}` — 발행 6개 전부 비대상 카테고리라 실측 예시는 없었으나, 이번 라운드에서 확인한 다른 3개 하위 객체(afterServiceInfo/sellerCodeInfo/originAreaInfo)가 전부 우리가 PUT으로 보내는 것과 완전히 대칭인 형(같은 키 이름)이라 신뢰. 다음에 식품/화장품 카테고리 상품을 임포트하면 재검증 권장 |
| **detailImages** | ❌ 매핑 불가(확정) | 네이버는 이 값을 별도 필드로 반환하지 않음 — `detailContent`가 이미 완성된 HTML 하나로 전부 합쳐져 있다(6개 상품 전부 실측: 순수 네이버 Smart Editor(se-viewer) 마크업이거나 우리 시스템이 만든 합성 HTML이거나 겉모습이 완전히 다름). 이 HTML을 되짜서 "이 이미지가 상세페이지 이미지였다"를 구조적으로 복원하는 것은 파싱 추측이라 하지 않음 |
| **detailImageUrl** | ❌ 매핑 불가(확정) | 위와 동일 근거. `detail_image_url` 하나만 별도로 있는 게 아니라 `detailContent` 안에 다른 이미지들과 뒤섞여 있음 |
| **hookPhrase** | ❌ 매핑 불가(확정) | 위와 동일 근거. `product.hookPhrase`도 `detailContent` 상단에 텍스트 블록으로 합쳐질 뿐, 네이버 응답에 별도 필드 없음 — 인계문서 §3-2의 "네이버에 없는 필드는 가져올 수 없다"가 정직한 결론 |
| **keywords** | ❌ 매핑 불가(확정, 다른 이유) | 네이버 응답에는 `seoInfo.sellerTags`만 있고 별도 `keywords` 배열이 없음(6개 전부 실측). 우리 쪽 `buildSeoInfo()`가 `tags`+`keywords`를 합쳐서 `sellerTags`로 보내기 때문에(product-builder.ts:647) 네이버에서 받은 시점엔 이미 하나로 합쳐져 있어 되돌릴 수 없음. `tags`는 이미 import가 채우고 있으므로(`pickSellerTags`) 실질적 손실은 없음 |
| **shippingTemplateId** | ❌ 매핑 불가(확정) | 인계문서 §3-4의 우려가 사실로 확인됨 — 이건 네이버가 주는 값이 아니라 우리 `ShippingTemplate` 테이블의 내부 FK다(`load-update-context.ts:80-81`, `dbProduct.shipping_template_id`로 우리 테이블을 조회해 `deliveryInfo`를 만드는 구조). 네이버 응답의 `deliveryInfo`(배송비·택배사 등 인라인 값)를 우리 템플릿과 역매칭하는 건 확실한 대응이 없어 추측이 되므로 시도하지 않음 |

**결론**: 10건 중 5건(asPhone/asGuide/brand/sellerCode/unitPrice)은 실제로 네이버가 반환하는 구조화된 필드라 매핑 완료. 나머지 5건(detailImages/detailImageUrl/hookPhrase/keywords/shippingTemplateId)은 "네이버 API 응답에 대응 필드가 없거나(HTML로 합쳐짐/이미 병합됨) 내부 개념(로컬 FK)"이라는 게 확정된 사실 — 코드로 채울 방법이 없다.

## 2. 구현 (`src/app/api/products/import/route.ts`)

`pickAfterService(op)` / `pickBrand(op)` / `pickSellerCode(op)` / `pickUnitPrice(op)` 4개 헬퍼 추가(기존 `pickOrigin` 패턴 그대로). `prisma.product.create()`에 `asPhone`/`asInfo`/`naver_brand`/`sellerProductCode`/`unit_price_yn`/`unit_total_capacity`/`unit_capacity`/`unit_indication_unit` 8개 컬럼 추가.

### ★ 부수 발견 (수정 안 함, 범위 밖 — #340과 같은 패턴)
`sellerCode` 화이트리스트 필드의 실제 배선을 추적한 결과, **씨앗심기 폼의 "판매자 상품코드" 입력란은 `Product.sku` 컬럼에 저장되는데(`product-form-mapping.ts`), `buildNaverProductPayload`가 실제로 네이버에 PUT하는 값은 `Product.sellerProductCode`라는 별개 컬럼이다**(product-builder.ts:1094). 즉 부분재연동 dirty-field 감지기가 지금 추적 중인 "판매자 상품코드"는 실제로 네이버에 나가는 값과 다른 컬럼을 보고 있다 — 폼에서 그 값을 바꿔도 네이버 payload는 안 바뀔 수 있다. 이번 임포트는 올바른 컬럼(`sellerProductCode`)에 저장하지만, 씨앗심기 폼 배선 자체를 고치는 건 이번 스코프(import route) 밖이라 다음 라운드 후보로 기록만 한다. `docs/plan/PRINCIPLES_LEARNED.md`에 별도 원칙으로 등재 검토 권장.

또한 `brand`(연산자 직접입력용)와 `naver_brand`(네이버에서 읽어온 값) 두 컬럼이 있는데, `buildNaverProductPayload`는 실제로 이 둘 중 어느 것도 outgoing PUT 페이로드에 포함하지 않는다(내부 속성완결성 점수 `calcAttributeCompleteness`에서만 읽음) — 브랜드는 현재 시스템에서 네이버로 왕복 동기화되는 필드가 아니다(부분재연동 화이트리스트가 추적은 하지만 실제 효과는 없는 필드). 이 또한 범위 밖이라 기록만.

## 3. 검증

- `npx tsc --noEmit` 0 · `npm run build` 0.
- 실제 신규 임포트 1회로 end-to-end 검증: 미연동 실 네이버 상품(`11431754381`, "귀여운 강아지 휴지 케이스...")을 로컬 dev 서버에서 실제 `/api/products/import`로 가져와 DB 확인 —
  ```
  naverCategoryCode: "50002490"
  naver_origin: "중국산(꽃틔움(협력사))"
  asPhone: "010-3227-4805"
  asInfo: "|평일| 오전10:00~오후06:00 ..."
  naver_brand: "꽃틔움(협력사)"
  sellerProductCode: "DMM_50201215"
  tags: [10개 셀러태그 정상]
  originCode: "0200037"
  ```
  전부 정확히 채워짐. 테스트 상품은 즉시 DELETE로 정리, DB 재조회로 완전 삭제 확인(테스트 데이터 잔존 0).

## 4. 전 상품 공통 관점 — 기존 6개 상품 백필 (안전장치 백필과 통합)

인계문서 §5의 지시대로, 부분재연동 안전장치 작업에서 만든 `scripts/backfill-naver-category-origin.ts`를 이번에 확장했다(별도 스크립트를 새로 만들지 않고 하나로 통합) — 카테고리·원산지에 더해 `asPhone`/`asInfo`/`naver_brand`/`sellerProductCode`/단위가격 4필드까지 "앱 DB가 비어있으면 네이버 GET값으로 채우기"를 같은 안전 원칙(빈 값만 채움, 기존 값 덮어쓰기 절대 금지)으로 처리한다.

dry-run 재실행 결과(발행 6건 전수):
```
scanned: 6, fieldsFixed: 23, productsChanged: 6, unchanged: 0, getFailed: 0
```
카테고리 5건 + 원산지 6건 + 브랜드 6건 + 판매자코드 6건 = 23건. **asPhone/asInfo는 6건 전부 이미 스키마 기본값("고객센터 문의"/"평일 10:00~18:00")이 채워져 있어 "빈 값"으로 판정되지 않아 백필 대상에서 제외됨** — 이건 진짜 값이 아니라 플레이스홀더지만, 스크립트는 "값이 있으면 덮어쓰지 않는다"는 안전 원칙을 그대로 지켰다. 이 6건의 AS 정보가 플레이스홀더인지 실제 값인지는 수동 확인이 필요하며, 자동 백필 대상이 아니다(범위 밖 기록).

**`--apply`는 이번에도 미실행** — 두 환경 핑퐁 프로토콜(#41)에 따라 Desktop 검토 후:
```bash
npx tsx scripts/backfill-naver-category-origin.ts --apply
```

## 5. 화이트리스트 후속 검토 필요 (Desktop/운영자 판단, 이번엔 코드 변경 안 함)

`docs/design/NAVER_PARTIAL_SYNC_2026-08-11.md`의 18필드 화이트리스트 중, 이번 조사로 "네이버 API에 대응 필드가 아예 없거나 실제로 PUT에 포함 안 됨"이 확정된 필드가 5개(detailImages/detailImageUrl/hookPhrase/keywords) + brand(payload 미포함)까지 있다. 이 필드들을 dirty-field 감지기가 계속 추적하는 게 맞는지(사용자에게 "바뀜"으로 보여주되 실제 네이버 반영은 안 되는 상태를 그대로 둘지, 아니면 화이트리스트에서 빼서 오해를 막을지)는 운영자 판단이 필요한 별개 이슈로 남긴다 — 이번 임포트 완전성 작업의 스코프는 "가져올 수 있는 값을 가져오는 것"까지다.

## 완료 체크리스트
- [x] `npx tsc --noEmit` 0 errors
- [x] `npm run build` 0 errors
- [x] 실 신규 임포트로 5개 필드 end-to-end 검증(테스트 데이터 정리 완료)
- [x] 기존 6개 상품 백필 스크립트 통합·dry-run 검증(`--apply` 미실행)
- [ ] 커밋·push (다음 단계)
- [ ] Desktop 재검증
