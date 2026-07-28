# 네이버 커머스 API v2 — 상품정보제공고시(productInfoProvidedNotice) 연결 완벽 명세

> 저장일: 2026-06-02 | 출처: Desktop 심층 리서치 | 권위 문서 (정보고시 API 연동 baseline)
> 트리거: 달항아리 register 400 + AS 템플릿코드 2976841 제공 → API 연결 방식 확정 필요.

---

## TL;DR
- **API v2 상품등록(POST /external/v2/products)에는 "정보고시 템플릿 번호(예: 2976841)"를 참조 연결하는 필드/방식이 없다.** 템플릿 ID는 판매자센터 UI 전용 개념. API는 매 상품마다 productInfoProvidedNotice 객체에 유형(productInfoProvidedNoticeType) + 개별 항목을 직접 인라인으로 채워 보내야 함.
- **400의 가장 유력 원인 = productInfoProvidedNotice 객체 통째 부재.** 달항아리 도어벨(50000963)은 "기타 재화(ETC)" 유형으로 채우는 것이 안전. 위탁배송 셀러는 대부분 텍스트 항목을 "상품상세참조"로 채울 수 있음(단 품명·모델명·제조사·소비자상담전화는 실제값 권장).
- AS 정보(afterServiceInfo)는 정보고시와 별개 객체로 detailAttribute 직속. 현재 코드 구조 맞음. 전화번호는 "010-XXXX-XXXX" 형식.

## Key Findings

1. **템플릿 코드 참조 방식 = 미지원(확정).** 공식 GitHub(commerce-api-naver) 메인테이너 답변+전체 스키마 어디에도 정보고시 템플릿 ID 필드 없음. productInfoProvidedNotice의 구조 필드는 productInfoProvidedNoticeType(유형) + 해당 유형 자식 객체(개별 항목)뿐. **판매자센터 템플릿 2976841은 API와 연동 안 됨.**

2. **개별 항목 직접 입력이 유일.** 메인테이너 답변(Discussion #241): productInfoProvidedNotice 자식으로 입력하는 유형은 대상 상품 속성에 근접한 1개 유형만 골라 입력. 예: productInfoProvidedNoticeType=WEAR이면 자식 노드로 wear만 구성.

3. **정보고시 "템플릿 목록" 조회 API는 없음 — 대신 카테고리 기반 "상품군" 조회 API 존재.** v2.23.0(2024-02-07)에 "상품정보제공고시 상품군 목록/단건 조회" API 추가, productInfoProvidedNoticeContents.fieldAddDescription 반환. categoryId 기준으로 필요 유형/필드 스키마를 알려줄 뿐 템플릿 코드는 미반환.

4. **AS 정보는 정보고시와 분리된 별도 객체.** afterServiceInfo는 detailAttribute 직속, productInfoProvidedNotice와 무관.

5. **위탁배송 표준문구 "상품상세참조" 허용.** 정보고시 텍스트 항목 대부분을 "상품상세참조"로 채우는 것이 관행.

## Details

### 1. productInfoProvidedNotice 객체 구조와 위치
경로: originProduct.detailAttribute.productInfoProvidedNotice

달항아리 도어벨(ETC 유형) 예시:
```json
"productInfoProvidedNotice": {
  "productInfoProvidedNoticeType": "ETC",
  "etc": {
    "returnCostReason": "상품상세참조",
    "noRefundReason": "상품상세참조",
    "qualityAssuranceStandard": "상품상세참조",
    "compensationProcedure": "상품상세참조",
    "troubleShootingContents": "상품상세참조",
    "itemName": "달항아리 도어벨",
    "modelName": "달항아리 도어벨",
    "manufacturer": "꽃틔움 가든 협력업체",
    "afterServiceDirector": "",
    "customerServicePhoneNumber": "010-XXXX-XXXX"
  }
}
```
핵심 규칙: type=ETC이면 자식 노드로 etc만, WEAR이면 wear만. 유형과 자식 객체 이름 불일치 시 거부.

### 2. 정보고시 유형 종류와 도어벨 매핑
자식 객체 34종: wear, shoes, bag, fashionItems, sleepingGear, furniture, imageAppliances,
homeAppliances, seasonAppliances, officeAppliances, opticsAppliances, microElectronics,
navigation, carArticles, medicalAppliances, kitchenUtensils, cosmetic, jewellery, food,
generalFood, dietFood, kids, musicalInstrument, sportsEquipment, books, rentalEtc,
digitalContents, giftCard, mobileCoupon, movieShow, etcService, biochemistry, biocidal, etc.

**달항아리 도어벨(수공예 인테리어 소품) 권장 = ETC(기타 재화).** 침대/소파 같은 일반 가구 아니므로 furniture보다 etc 적합.

- ETC 필수(★) 8개: returnCostReason, noRefundReason, qualityAssuranceStandard,
  compensationProcedure, troubleShootingContents, itemName, modelName, manufacturer.
  추가: customerServicePhoneNumber는 afterServiceDirector 미입력 시 필수 (둘 중 하나 필수).
- furniture(참고, 17필드): 공통5 + itemName, certificationType, color, components, material,
  manufacturer, importer, producer, size, installedCharge, warrantyPolicy, afterServiceDirector.

### 3. 템플릿 vs 개별항목 — 충돌 개념 없음
API에 템플릿 코드 필드가 없으므로 충돌/우선순위 시나리오 자체가 없음. 항상 개별항목 인라인 한 방식.
판매자센터 템플릿 2976841은 사람이 UI 등록 시 자동완성용. API는 그 결과값(개별항목 텍스트)을 직접 써야 함.

### 4. AS 정보와 정보고시 관계
```json
"detailAttribute": {
  "afterServiceInfo": {
    "afterServiceTelephoneNumber": "010-XXXX-XXXX",
    "afterServiceGuideContent": "평일 10:00~18:00 응대, 주말·공휴일 휴무"
  },
  "productInfoProvidedNotice": { ... }
}
```
- afterServiceInfo는 productInfoProvidedNotice와 형제(sibling) 객체, 둘 다 detailAttribute 직속. 현재 코드 구조 올바름.
- afterServiceTelephoneNumber는 전화번호 형식("010-2490-7519" 등 하이픈 포함). 안내 텍스트는 afterServiceGuideContent에.
- etc.customerServicePhoneNumber(소비자상담)와 afterServiceInfo.afterServiceTelephoneNumber(AS전화)는 별개 항목. 위탁셀러는 보통 둘 다 본인 업무용 번호로 동일하게.

### 5. 흔한 400과 해결책
- 정보고시 객체 부재 시 BAD_REQUEST("입력정보가 올바르지 않습니다"). 단 400은 복합 원인일 수 있음(FAQ #356).
- 주의: Discussion #241 실제 400 원인은 "본문이 Body 아닌 URL 파라미터로 전달"이었고 정보고시는 이미 ETC 포함. 400 시 (a)Content-Type=application/json (b)본문이 진짜 Body에 JSON (c)정보고시 객체+필수항목 모두 점검.
- 유효성 진단: 응답 본문 invalidInputs 배열에 name(필드경로)+message로 문제 필드 명시. GNCP-GW-Trace-ID 로깅 권장.
- 위탁 표준문구: returnCostReason/noRefundReason/품질보증/보상절차/처리내용에 "상품상세참조" 허용·관행. 단 품명·모델명·제조사·소비자상담전화는 실제값 권장.

## Recommendations (실행 4단계)

**1단계 (즉시 — 400 해소):** detailAttribute에 위 ETC 정보고시 블록 추가.
- customerServicePhoneNumber 또는 afterServiceDirector 중 최소 하나 필수.
- 기존 afterServiceInfo 그대로 유지(별도 객체).
- **템플릿 번호 2976841을 payload에 넣으려는 시도 즉시 중단** (무시되거나 unknown field 오류).

**2단계 (검증):** dryRun 재실행 → invalidInputs 배열 비었는지 확인. 정보고시 외 필드(visitAddressId, 인증제외여부 등)도 점검.

**3단계 (정확도, 선택):** "상품정보제공고시 상품군 단건 조회" API를 대카테고리 ID로 호출, 50000963에 ETC 적합 여부 + 필수필드(fieldAddDescription) 확정. 가구 분류 필요 시 furniture로 전환.

**4단계 (운영 자동화):** ETC 정보고시 블록을 코드 상수로 내장, 상품별로 itemName/modelName/manufacturer/전화번호만 변수 치환. 모든 호출 GNCP-GW-Trace-ID 로깅.

**판단 임계값:**
- 400 사라지고 200/201 → 정보고시 누락이 원인 확정.
- 400 지속 + invalidInputs에 정보고시 무관 메시지 → 다른 필드(인증제외여부/주소ID/묶음배송ID) 원인, 메시지 따라 수정.
- ETC 등록되나 카테고리 부적합 경고 → furniture 전환.

## Caveats
- "상품군 목록/단건 조회" API 정확한 REST 경로는 검색으로 미확정. categoryId 파라미터 기반만 확인. 정확한 path는 apicenter.commerce.naver.com 공식문서(클라이언트 렌더링) 최종확인 필요.
- 전체 스키마는 v1 시점 페이로드 기반이나 메인테이너 답변·v2 릴리즈노트와 일관. 네이버가 필수항목 수시 강화하므로 하드코딩보다 상품군 조회 API 주기 검증 권장.
- ETC 권장은 일반 판단. 특정 카테고리에서 네이버가 다른 유형 강제 시 상품군 조회 결과 우선.

## 출처
- 네이버 커머스 API GitHub Discussions: #241(정보고시 유형 인라인 입력), #516(308/유효성), #1640(상품수정 오류), #2216(상품등록 에러), #356(400 FAQ), v2.23.0 릴리즈노트(#1469 상품군 조회 API)
