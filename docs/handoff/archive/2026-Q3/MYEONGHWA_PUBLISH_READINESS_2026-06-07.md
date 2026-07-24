# 명화 발행 준비도 — GO 직전 (2026-06-07 최종 갱신)

> Naver update dryRun 단정 + 상세페이지 전 정보 반영 완료. naverProductId 13564133057.

## 발행 준비도 — 2축 분리 (#117)
> ★ 드리프트 정정(2026-06-21): 구 "ALL GREEN"은 **속성 준비도**만 가리켰음. 소싱·가격 준비도는 별개 축이며 씨앗심기 백필 대기 상태(발행 차단).

**속성 준비도 = GREEN**
- readinessGrade **A / 84** · attributeGrade **A / 78**
- errors [] · warnings [] · **missingRequired []**
- statusType **SALE** (PUT 시 판매중지 해제·#113/#114)

**소싱·가격 준비도 = 씨앗심기 백필 대기 (#117·BLOCKED)**
- 판매가/마진은 씨앗심기(SEO/ROI 소싱 시드·원가) 백필 후에만 확정 — 현재 미충족.
- 디자인-전-소싱(STEP6 점프) 위반 → `sourcing_incomplete`. STEP0(발행 시퀀스)에서 해소.

## 상세페이지 근거 → 반영 완료 (전부 가역 DB)
| 항목 | 값 | 근거 |
|---|---|---|
| 제조국 | 중국산 (originCode 0200037) | 운영자 확정(2026-06-21·memory #17) — 구 '국산(00)' 정정(#44/#113) |
| 재질 | 유리 | 전 제품컷 유리병 (enum exact) |
| 색상 | 투명 | 투명 유리 용기 (enum exact) |
| 향 | 4종(레몬유칼립·에이프릴 후레쉬·블랙체리·코튼어라운드) | 헤더·향정보 4종 → 옵션 추가 완료 |
| 안전확인 신고번호 | HB21-12-2572, HB19-12-1462 | 전 향종 표시사항(라인 2개) → naver_certification 설정 |
| 상품명 | 명화 차량용방향제 송풍구 디퓨저 자동차 에어컨냄새제거 선물 (32자) | seo-text 정제·중복0 |
| sellerTags | 10종 | seo-text draft.tags |

## ★ PUT 전 마지막 검증 1건 (#46)
- dryRun payloadPreview에 **안전 신고번호(HB)가 미표시** — preview가 핵심필드 부분집합이라 productInfoProvidedNotice(정보고시) 섹션이 빠진 것으로 추정. 단 **생활화학제품 표시가 SUSPENSION 유력 원인**이므로, PUT(비가역) 전 정보고시에 HB가 실제 실리는지 단정 필요.
- → Code: update dryRun payloadPreview에 productInfoProvidedNotice(qualityAssuranceStandard 등) 포함 → Desktop이 HB 표시 재단정 → 그 후 대표 GO.

## ★ O3 정보고시 자동조립 검증 결과 (2026-06-23 · Code 실측 · 코드 단정)
> 위 '★ PUT 전 마지막 검증 1건'의 'preview가 정보고시 미표시 추정'은 **stale로 정정**(아래).

- **정보고시는 매 상품 자동조립**: buildNaverProductPayload가 productInfoProvidedNotice(ETC)를 인라인 생성(product-builder.ts:933·964). productInfoName/Manufacturer/Model 입력은 **필수 아님** — buildProductInfoProvidedNoticeEtc(383-423) 폴백 체인이 채움: itemName=productInfoName ?? naver_title ?? name, modelName=productInfoModel ?? naver_title ?? name, manufacturer=productInfoManufacturer ?? naver_manufacturer ?? 스토어명. **명화 productInfo* 전부 null이어도 정보고시 객체 자체는 non-null로 조립**(폴백 충진).
- **HB는 qualityAssuranceStandard에 적재**: formatSafetyDeclaration(naver_certification)이 '안전기준 적합확인 신고번호 …'를 etc.qualityAssuranceStandard에 prepend(404-407). 전용 인증필드 없음(값 있을 때만·전상품 무회귀). 명화 naver_certification=HB21-12-2572, HB19-12-1462 설정 시 노출.
- **dryRun preview는 이미 정보고시 노출**: update/route.ts:104-105가 payloadPreview.productInfoProvidedNotice 반환(주석 101-103=HB를 qualityAssuranceStandard에서 검증 명시). → 운영자가 update dryRun으로 HB 실적재를 즉시 fact-check 가능(= naver_certification 실제 set 여부도 동시 확인).
- **미단정(코드 불가·단정 금지)**: ETC 폴백 placeholder('상품상세참조') + HB-in-qualityAssuranceStandard 조합이 네이버 SUSPENSION을 실제 해제하는지(전용 생활화학제품 고시유형 요구 여부)는 **서버 수락 영역 — 코드로 단정 불가**. update dryRun preview 실측 + 실 PUT 후 inspect로만 확정.

## 발행 시퀀스 (남은 단계)
0. **(STEP0·선결) 씨앗심기 소싱 백필** — 크롤(도매매) → 원가/마진 입력 → **판매가/마진 확정**(#117). 미충족 시 이하 단계 진입 금지(`sourcing_incomplete`).
1. (Code) dryRun preview에 정보고시 노출 → (Desktop) HB 표시 단정.
2. (대표) 최종 GO.
3. (Desktop) update confirm:true → PUT(비가역) → statusType SALE 전환.
4. (Desktop) inspect 3중 검증: statusType SALE·정보고시 HB·origin 중국산(0200037)·옵션 4종.

## ★ O1/O2 양라인 현황 (2026-06-23 · Code 박제)

**O1 = DONE (대표이미지 승인)**: 명화 대표이미지(thumbnail) 평가·승인 완료 — thumbnail_assessed_at 세팅·C19b UI 게이트 통과·가역 확인(재평가 DELETE 원복 가능). 발행 게이트 thumbnailAssessed 입력 충족.

**O2 = 시각검증 완료**: 단순 라인 상세 = detail-source **READY**(프로 공급사 상세·인증·변형·사용법·푸터 완비, 시각확증·#122 적용). 디테일 라인 상세 = detail-S6 **부분골격**(5섹션 합성 필요). → 단순 라인은 발행 자산 완비, 디테일은 별도 합성 트랙(C24·발행후).

**명화 발행 잔여(임박)**: 단순 pre-PUT dryRun + 씨앗심기(소싱·가격·#117) + 대표 GO(비가역 #46). 단순 라인 자산 측면은 준비 완료.

| 라인 | 대표(썸네일) | 상세 | 상태 |
|---|---|---|---|
| 단순 | 승인 완료(O1 DONE·thumbnail_assessed_at) | detail-source READY(공급사 상세·인증·변형·사용법·푸터) | 발행 자산 완비 — pre-PUT dryRun+씨앗심기+GO만 잔존(#117) |
| 디테일 | (단순 공유 또는 별도) | detail-S6 부분골격 → 5섹션 합성 필요 | 합성 트랙 C24(발행후·#116·#125) |

## ★ dryRun 안전 호출 + 발행경로 확정 (2026-06-23 · Code)

**update dryRun = 비커밋·읽기전용(네이버 무접촉)**. `isDryRun = dryRun===true || confirm!==true`(update/route.ts:45) — confirm 미포함이면 무조건 preview. 실 PUT은 `confirm===true && dryRun!==true`에서만(:163).

Desktop read-only 호출(절대 PUT 아님·#46):

```
fetch('https://kkotium-garden.vercel.app/api/naver/products/update', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ productId: 'cmpnooli40001f0gveaxr8iim', dryRun: true }),
}).then(r => r.json())
// → data.payloadPreview.productInfoProvidedNotice.etc.qualityAssuranceStandard 에서 HB 확인
```

반환 payloadPreview: name·leafCategoryId·salePrice·statusType·representativeImage·originAreaInfo·sellerTags·optionCombinationValues·**productInfoProvidedNotice**·imagesToUpload. 가드: productId 필수·naverProductId 등록필수(409)·addressbook 동기화(400). 명화=등록완(naverProductId 13564133057).

**발행경로 = DB자산 기반(studio 「이미지 저장」 게이트와 독립)**: /api/naver/products/update는 DB row(mainImage·additionalImages·detail_image_url)로 full payload를 빌드·발행한다(update/route.ts:107-119·158). studio 「이미지 저장」 버튼(canSave=인앱 생성 state만 인식)은 한 UI 경로일 뿐, 기존 DB자산 발행을 막지 않는다. 명화 단순 라인(DB자산 보유)은 update dryRun→confirm로 발행 가능.

## ★ dryRun 발행검증 결과 + 상세 전체교체 안전성 (2026-06-23 · Desktop dryRun + Code 판정)

**dryRun 발행검증 (Desktop 실측·read-only)**: `canRegister: true` · readiness **S/94** · errors **0** · 대표이미지 = 기존 폴더적재 Storage 자산(인앱 재생성 아님) · HB · 원산지(중국 0200037) · 가격 · 옵션 · SEO 전부 정상. → 명화 **발행 임박**.

**★ 상세 전체교체(detailContent) 안전성 판정 (Code·#46)**:
- **detailContent는 payload에 항상 포함**(product-builder.ts:941 `detailContent: buildDetailContent(product, noticeAssets)` 무조건). → 'full-replace → 누락 필드 제거' 경고가 detailContent를 strip하지 않음. 빈값 PUT 위험 없음.
- buildDetailContent(:649) 조립 순서: 공통상단슬롯 → hookPhrase → **detail_image_url** → description → AEO → 공통하단슬롯. **전부 비면** placeholder `<div>{상품명}</div>` 1줄(:697-700).
- **명화**: detail_image_url 존재(단순라인 상세 READY) → detailContent non-empty · non-placeholder. **empty-wipe 위험 없음**. 실 PUT은 detail 이미지를 Naver(shop-phinf) 업로드 후 detailContent에 임베드(update/route.ts:122-153).
- **잔여 위험 2종**: (1) dryRun payloadPreview에 **detailContent 미표시**(update/route.ts:88-110이 imagesToUpload.detailImage=소스URL만 노출, 조립 HTML 미노출) → 실 교체물 fact-check 갭. (2) full-replace라 DB상세 < 라이브 상세면 downgrade.
- **PUT 권고(조건부 허용)**: 명화는 empty-wipe 위험 없음 → (a) PUT 전 라이브 Naver 상세 GET 스냅샷(롤백 보험·비가역 대비) + (b) DB detail_image_url이 발행하려는 단순라인 상세와 일치 확인 → 두 가지 확인 시 PUT 안전. 미확인이면 차단.
- **보존 방안**: ① dryRun preview에 detailContent(길이·이미지수·요약) 노출 추가(코드·GO-gated·C25/P2-E) ② PUT 전 GET origin-products/{no} 스냅샷 보관.

## 비고
- 빌더는 구조화 카테고리 속성을 네이버 미전송(Code 확인) → 재질/색상은 내부 완성도 게이트. 단 productInfoProvidedNotice(정보고시)는 전송 대상 → HB 표시가 실 발행 핵심.
- seoTitle·keywords·brand_line 내부 비동기(P3) — 발행 빌더는 name=naver_title·sellerTags=tags 사용이라 발행 무관.
- NAVER_AUTOSUSPEND_ENABLED off 유지 권고.
