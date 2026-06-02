# 네이버 위탁배송 배송정책·마진·전환율 최적화 설계안

> 저장일: 2026-06-02 | 출처: Desktop 심층 리서치 | 권위 문서 (배송 정책 baseline)
> 트리거: 달항아리 register 21:53 KST → 400 "묶음그룹 설정시 지역별 배송비는 입력하실 수 없습니다"
>   (Empty.deliveryBundleGroup.id) + originAreaInfo.importer NotEmpty.
> 대표 요구: 공급사별 묶음배송 가능여부 다름(이현마켓=묶음가능 추가비0), 도서산간 공급사마다 다름,
>   3만/5만 무료배송 마케팅 레버 개선.

---

## TL;DR
- **묶음배송(deliveryBundleGroupId)과 지역별 배송비(deliveryFeeByArea)는 네이버에서 구조적으로 양립 불가.**
  둘 다 받으려면 제주/도서산간 추가비를 상품(deliveryFeeByArea)이 아니라 **배송비 묶음그룹 자체에 설정**.
  → API payload에서 deliveryFeeByArea 빼고 deliveryBundleGroupId만 전송, 권역비는 판매자센터 그룹에 미리 세팅.
- **공급사별 배송비 묶음그룹 1:1 분리**가 위탁 1인 셀러 최적. 같은 공급사(이현마켓) 상품끼리만 합배송,
  제주/도서산간비는 그룹에 한 번 설정 → 그룹 내 전 상품 일괄 적용.
- **조건부 무료배송(CONDITIONAL_FREE) 임계값 = AOV × 1.2~1.3**이 전환율+마진 동시 방어 정석.
  도입 시 통상 AOV 10~25%, 전환율 5~15% 상승. 위탁은 배송원가를 판매가에 녹여 마진 보호 필수.

## Key Findings

### 1. 충돌 원인과 해결책
에러 {"name":"originProduct.deliveryInfo","type":"Empty.deliveryBundleGroup.id",
"message":"묶음그룹 설정시 지역별 배송비는 입력하실 수 없습니다."}
= 묶음그룹과 상품 단위 지역별 배송비가 상호배타적. 묶음그룹은 그룹 전 상품에 단일 배송비 정책 강제 →
상품마다 다른 지역별 추가비(deliveryFeeByArea)와 충돌.
(주의: 이 정확한 문구의 공식 관리자 답변은 GitHub Discussions에서 미확인. 단 에러 메시지 자체가
명확한 검증 규칙이며 판매자센터 UI 동작과 일치.)

해결 (판매자센터 UI 동작 기준):
- **묶음배송 불가 상품**: 제주/도서산간 추가비를 상품(배송 탭)에서 직접 → API deliveryFeeByArea 전송.
- **묶음배송 가능 상품**: 추가비를 '배송비 묶음그룹 관리'에서 그룹 단위로 설정 →
  API는 deliveryFeeByArea 절대 미전송, deliveryBundleGroupId만 전송.
→ 제주/도서산간 추가비는 묶음배송 쓰는 순간 '그룹의 속성'이 되며 상품 payload에서 사라짐.

### 2. deliveryBundleGroupId의 정체와 획득
- 판매자센터에서 미리 만든 묶음그룹의 숫자 ID (실제 사례값 26971339).
- **묶음그룹 생성/조회 전용 공식 API는 미확인** (문서·릴리즈노트·FAQ 어디에도 없음 → Caveat).
  판매자센터 → 상품관리 → 배송정보관리(배송비 관리) → '묶음그룹 추가' 수동 생성 → 숫자 ID를 API에 전달.
  같은 묶음그룹 ID 상품끼리 합배송. (도매매 campus FAQ도 동일 워크플로 명시)
- 주의: v2.45.0(2024-12-11) '그룹상품 등록(POST /v2/standard-group-products)'은 묶음배송 그룹이 아니라
  '그룹상품(표준형 묶음상품)' — 전혀 다른 API. 혼동 금지.

### 3. 조건부 무료배송 임계값 — 데이터 기반
- **임계값 = AOV × 1.2~1.3** 현업 표준 (EasyApps "Current AOV × 1.25 = Starting Threshold",
  ReferralCandy/MarketingMonk 25~35%/30%).
- 효과: 도입 시 통상 AOV 10~25%, 전환율 5~15% 상승.
- 글로벌 조건부 무료배송 중간 임계값 $64이나 소비자 추가지출 의향 평균 $43 (약 $21 격차) →
  임계값 과도하게 높이면 안 되는 이유.

## Details

### A. deliveryInfo 객체 구조와 제약
- deliveryBundleGroupUsable(boolean) / deliveryBundleGroupId(숫자 ID; null이면 기본 묶음)
- deliveryFee.deliveryFeeType: FREE/PAID/CONDITIONAL_FREE 실페이로드 검증됨. 수량별 차등 타입 존재하나
  정확한 enum 문자열은 공식 문서 확인 필요.
- deliveryFee.baseFee: 기본 배송비
- deliveryFee.freeConditionalAmount: 조건부 무료배송 임계 금액(원). 경로
  originProduct.deliveryInfo.deliveryFee.freeConditionalAmount 확정.
- deliveryFee.repeatQuantity/secondBaseQuantity/secondExtraFee/thirdBaseQuantity/thirdExtraFee: 수량별 차등
- deliveryFee.deliveryFeePayType: PREPAID/COLLECT/COLLECT_OR_PREPAID
- deliveryFee.deliveryFeeByArea: deliveryAreaType=AREA_2/AREA_3, area2extraFee, area3extraFee
  — **묶음그룹과 동시 사용 불가**
- claimDeliveryInfo: returnDeliveryFee(반품 편도)/exchangeDeliveryFee(교환 왕복)

중요 제약: 무게별/수량별/구매금액별 차등 배송비 쓰면 묶음배송 미적용. 묶음 가능 타입은 고정/무료/조건부무료/
기본 따르는 무게별·수량별만. 같은 배송 템플릿(=같은 묶음그룹) 상품만 묶음 동작.

### B. 권장 API 페이로드

**① 묶음배송 가능 공급사 (이현마켓) — 권역비는 그룹에 위임**
```json
"deliveryInfo": {
  "deliveryType": "DELIVERY",
  "deliveryAttributeType": "NORMAL",
  "deliveryBundleGroupUsable": true,
  "deliveryBundleGroupId": 26971339,
  "deliveryFee": {
    "deliveryFeeType": "CONDITIONAL_FREE",
    "baseFee": 3500,
    "freeConditionalAmount": 30000,
    "deliveryFeePayType": "PREPAID"
    // deliveryFeeByArea 절대 미포함 (포함 시 400)
  },
  "claimDeliveryInfo": { "returnDeliveryFee": 7500, "exchangeDeliveryFee": 7500 }
}
```
→ 제주/도서산간 추가비는 그룹 26971339에 판매자센터에서 미리 설정, 그룹 내 전 상품 자동 적용.

**② 묶음배송 불가 공급사 — 권역비를 상품에 직접**
```json
"deliveryInfo": {
  "deliveryType": "DELIVERY",
  "deliveryAttributeType": "NORMAL",
  "deliveryBundleGroupUsable": false,
  "deliveryFee": {
    "deliveryFeeType": "PAID",
    "baseFee": 3500,
    "deliveryFeePayType": "PREPAID",
    "deliveryFeeByArea": { "deliveryAreaType": "AREA_3", "area2extraFee": 5000, "area3extraFee": 5000 }
  },
  "claimDeliveryInfo": { "returnDeliveryFee": 7500, "exchangeDeliveryFee": 7500 }
}
```

**앱 분기 핵심**: supplier.bundleCapable === true → payload ①(deliveryBundleGroupId 채우고 deliveryFeeByArea 제거),
false → payload ②(deliveryFeeByArea 채우고 deliveryBundleGroupId 제거). 이 한 줄 분기가 400 근본 해결.

### C. 공급사별 배송 템플릿 설계
위탁 표준 = 공급사별 묶음그룹 1:1 생성. 근거:
- 출고지가 공급사마다 다름 → 같은 공급사 상품끼리만 한 박스 묶임. 다른 공급사는 각각 배송비, 같은 공급사는 한 건.
- 묶음그룹 계산방식 = '그룹에서 가장 큰 배송비'로 보수적 → 합배송 손실 방지.
- **반품/교환 자동회수 OFF** = 위탁 핵심 리스크 관리(엉뚱한 주소 회수 사고 방지).

| 구분 | 묶음 가능 공급사 | 묶음 불가 공급사 |
|---|---|---|
| 묶음그룹 | 공급사별 전용 그룹 생성 | 미사용 |
| 제주/도서산간비 | 그룹에 설정 | 상품(deliveryFeeByArea)에 설정 |
| API 필드 | deliveryBundleGroupId | deliveryFeeByArea |
| 출고지 | 공급사 주소 | 공급사 주소 |

### D. 무료배송 임계값과 마진/전환 트레이드오프
- 장바구니 이탈 1위 = 배송비 등 추가비 (Baymard 2025: 47%가 결제 단계 추가비로 이탈, 평균 이탈률 70.19%).
- 위탁 저가 상품은 배송원가 비중 큼 → 무료배송 표기하려면 배송원가(택배단가+포장비)를 판매가에 녹여야. 안 녹이면 적자.
- 3만 vs 5만: AOV 낮으면(예 2.5만) 3만 임계가 "조금 더 담으면 무료" 넛지로 전환·객단가↑.
  AOV 대비 과도한 5만은 유인 약화. **임계값 = 스토어 AOV × 1.2~1.3** 시작 안전.

### E. CONDITIONAL_FREE vs PAID vs FREE — 네이버쇼핑 노출
- 네이버쇼핑 랭킹 = 적합도/인기도/신뢰도. 인기도 = 클릭·찜 / 판매실적 / 리뷰 / 최신성, 카테고리별 가중치 상이.
  판매지수 = 최근 2/7/30일 수량·금액 지수화.
- 배송정책은 직접 가중치보다 **무료/조건부무료 → 클릭률·전환율↑ → 판매실적 지수↑ → 인기도↑** 간접 경로.
  위탁 셀러에 CONDITIONAL_FREE = 전환 방어 + 객단가↑ + 랭킹 간접 기여의 균형점.

## Recommendations

**1단계 — 즉시(에러 해결)**
- 앱 상품등록에 공급사 묶음배송 가능여부 플래그(bundleCapable) 추가.
- bundleCapable=true → deliveryBundleGroupId 채우고 deliveryFeeByArea 제거.
  false → deliveryFeeByArea 채우고 deliveryBundleGroupId 제거. → 400 근본 해소.

**2단계 — 공급사 온보딩 프로세스화**
- 신규 공급사: ① 출고지 주소록 ② 공급사 전용 묶음그룹 생성(계산='가장 큰 배송비')
  ③ 그룹에 제주/도서산간비 설정 ④ 그룹 ID를 앱 공급사 마스터에 저장.
- 반품/교환 자동회수 OFF 전 공급사 공통.

**3단계 — 배송비/임계값 최적화(A/B)**
- 조건부 무료배송 임계값 = 스토어 실제 AOV × 1.25 시작. 1~2만원 단위 상향, 최소 2주씩 테스트.
  평균(mean) 아닌 중간값/최빈값 분포로 결정.
- 측정: 전환율, AOV, 건당 기여마진. 기여마진 음수=임계 너무 낮음, 전환율 15%+ 하락=너무 높음.
- 저가·경량 큐레이션 = 배송원가 내재화 후 무료배송 표기가 클릭·전환 유리. 부피·중량 큰 상품 = PAID 유지.

**기준선(현재값 평가)**: 기본 3500/선결제, 반품·교환 각 7500, 제주/도서산간 각 5000 = 모두 적정 범위.
반품 7500은 변심반품 억제+분쟁 회피 균형점. 단 도서산간 실비 6000+ 계약이면 5000→6000 상향 검토.

**판단 요약**: 같은 공급사 합배송 빈도 높음 → 묶음 우선. 단품 주문 다수+공급사 파편적 → 묶음 불가+deliveryFeeByArea.
객단가 상승 여력 → CONDITIONAL_FREE. 구조적 초저가 단품 → PAID 또는 배송비 내재화 FREE.

## Caveats
- 묶음그룹 생성/조회 전용 공식 API 미확인. 판매자센터 수동 생성 후 숫자 ID를 API 전달 구조로 추론. 릴리즈노트 모니터링.
- deliveryFeeType 전체 enum·수량별 차등 정확한 문자열은 공식 문서(SPA) 추가 확인 필요. FREE/PAID/CONDITIONAL_FREE만 검증.
- "묶음그룹 설정시 지역별 배송비..." 공식 관리자 해설 게시글 미발견. 제약은 실재(검증 메시지). 원하면 GitHub Discussions 문의.
- 무료배송 임계값·전환율 통계는 미국·글로벌 데이터. 네이버페이·제주 자동청구 등 한국 특성에 자체 데이터로 보정 필요.
- 네이버페이 주문 특성상 지역별 추가배송비 적용 제약 보고 있었음 → 제주/도서산간 1건으로 청구 금액 검증 후 대량 적용.

## 출처
- 네이버 커머스 API GitHub Discussions #2162(v2.45.0 릴리즈노트), 도매매 campus FAQ(묶음그룹 워크플로),
  Channel Talk(묶음배송 설정), Red Stag/Kanuka/Baymard(무료배송·이탈률 통계),
  EasyApps/MarketingMonk(임계값 AOV×1.25), itemscout/i-boss(네이버쇼핑 SEO 랭킹), online-financer(위탁 출고지/반품지)
