# 핸드오프: CTR/CVR 자동 회수 파이프라인 (프롬프트 자산화 피드백 루프)

> 작성: 2026-05-22 / Co-Founder(시니어) → Claude Code
> Target Session: claude-code (CLI)
> Branch: feature/prompt-asset-engine (동일 브랜치 또는 후속)
> 선행: HANDOFF_PROMPT_ASSET_ENGINE.md (DB 동기화 + 어댑터) 완료 후
> 목적: art_director_prompts.business_metrics 그릇에 네이버 판매 데이터 자동 주입
>        = 프롬프트 자산화 moat의 "연료관" 연결

---

## 0. 왜 이게 moat의 핵심인가

business_metrics 컬럼은 어제 빈 그릇으로 생성됨.
이 그릇이 자동으로 채워져야 "어떤 프롬프트가 실제로 전환을 높였나"를 안다.
→ 그래야 고득점 프롬프트가 베이스 템플릿으로 승격되는 강화학습 루프 작동.
연료관 없으면 = 자산화는 그냥 프롬프트 저장소(차별성 0).

---

## ★ STEP 5 검증 결과 (2026-05-22, Code audit 완료) — 설계 확정

3-tier 검증 결과 (코드 audit + 웹 문서 + 인접 데이터원):
- **CVR (주문·매출) = 자동 회수 가능 (확실)** — getOrders 엔드포인트 기구현
- **CTR (노출·클릭) = 커머스 API 불가** — 쇼핑파트너센터 웹 UI 전용, 공개 REST 없음

**시니어 결정: 옵션 A 기본 + B 선택적, C 폐기**
- A (CVR 자동화): 즉시 채택. 1인 셀러에게 CTR보다 CVR이 본질.
- B (CSV 수동 업로드): 파워셀러 단계에서 필요 시 추가. 지금은 보류.
- C (검색광고 키워드 CTR 추정): **폐기**. 상품 단위 매핑 부정확 →
  잘못된 프롬프트 승격 위험. 부정확한 데이터는 없느니만 못함.

→ 이 파이프라인은 **CVR-only 자동화**로 구현. CTR 관련 필드는 null 유지
  + dataSource로 출처 명시. 정직성 원칙 (HANDOFF 원안 유지).

---

## 1. CRITICAL — 네이버 API 제약 (확실 vs 검증필요 구분)

기존 src/lib/naver/api-client.ts 분석 결과:
- 인증: OAuth 2.0 (client credentials) + **프록시 구조 이미 존재**
  (NAVER_PROXY_URL 설정 시 등록IP 프록시 경유, 미설정 시 직접호출)
- BASE_URL: https://api.commerce.naver.com/external
- 토큰 캐시 인메모리 (60초 버퍼)
→ CTR/CVR 회수도 이 검증된 통로 재사용. 새 인증 인프라 불필요.

### 확실한 것 (네이버 커머스 API 제공)
- 주문 데이터 (상품별 판매 건수, 매출) → CVR 분자 확보 가능
- 정산 데이터

### 검증 필요한 것 (★ Claude Code 첫 작업)
- **상품 노출수(impressions)·클릭수(clicks)** = CTR 분모/분자
  → 네이버 커머스 API에 이 통계 엔드포인트가 있는지 확인 필요.
  → 후보: 통계 API (statistics), 또는 네이버 쇼핑파트너센터 별도 API
  → 없으면: CTR은 수동 입력 or 추정으로 폴백 (CVR만 자동)

검증 방법:
```
api-client.ts의 callNaverApi 함수로 아래 엔드포인트 GET 테스트:
- /v1/statistics/... (있는지)
- 네이버 공식문서 https://apicenter.commerce.naver.com 에서
  "통계" 카테고리 엔드포인트 확인
```

> 정직 원칙: CTR을 못 받아오면 솔직히 CVR만 자동화하고
>   CTR은 "수동 입력 or 추정" 폴백으로 설계. 헛코드 금지.

---

## 2. 회수 파이프라인 설계 (검증 후 구현)

### 2-1. 신규 cron route
src/app/api/cron/metrics-sync/route.ts (기존 inventory-sync 패턴 복제)
- CRON_SECRET 인증 (기존 패턴)
- Vercel cron: 일 1회 (새벽) 권장 — 통계는 일단위 충분
- vercel.json에 schedule 추가

### 2-2. 회수 로직 (src/lib/metrics/metrics-collector.ts 신규) — CVR-only 확정판
```
1. art_director_prompts에서 result_image_url IS NOT NULL
   AND seller_used = true AND product_id IS NOT NULL
   AND deprecated = false 행 조회 (= 실제 사용된 활성 프롬프트만)
2. 각 product_id로 Product.naverProductId 조회 (FK 조인)
3. getOrders({ lastChangedFrom: 30일전 KST ISO, lastChangedTo: now, pageSize: 300 })
   - 기존 api-client.ts getOrders 재사용 (검증된 엔드포인트)
   - 응답 파싱: data.data.contents[] (getTodayOrderSummary 패턴 그대로)
   - 페이지네이션: contents가 pageSize(300) 꽉 차면 pageNum++ 반복
4. 각 order에서 productId 추출 → naverProductId 매칭 → 상품별 집계:
   - orders30d = 매칭 주문 건수
   - revenueAttribution30d = sum(totalPaymentAmount ?? paymentAmount)
5. business_metrics JSON 갱신 + metrics_refreshed_at = now()
   - impressions30d / clicks30d / ctr30d / conversionRate30d = null (CTR 불가)
   - dataSource = 'naver-commerce-api'
```

> ⚠️ 주문 응답의 productId 필드 경로는 실제 응답 확인 필요
>   (productOrder.productId vs productId vs originProductNo).
>   첫 실행 시 1건 덤프해서 정확한 path 확정 후 매핑 (헛코드 금지).
> ⚠️ naverProductId(채널상품) vs originProductNo(원상품) 구분 주의.
>   Product 테이블의 naverProductId가 주문 응답의 어느 필드와 맞는지 검증.

### 2-3. business_metrics JSON 구조 (CVR-only 확정판)
```json
{
  "listingId": "Product.naverProductId",
  "impressions30d": null,
  "clicks30d": null,
  "ctr30d": null,
  "orders30d": 0,
  "revenueAttribution30d": 0,
  "conversionRate30d": null,
  "dataSource": "naver-commerce-api",
  "windowStart": "ISO date",
  "windowEnd": "ISO date"
}
```
> - CTR 계열(impressions/clicks/ctr/conversionRate)은 null 고정 (커머스 API 불가).
>   나중에 CSV 업로드(옵션 B) 도입 시 manual로 채우고 dataSource 갱신.
> - orders30d / revenueAttribution30d만 자동. dataSource로 출처 추적.
> - 정직 원칙: 없는 데이터를 0으로 위장하지 말 것. null = "측정 안 됨", 0 = "측정했고 없음".

---

## 3. 강화학습 큐레이션 (회수 후)

src/lib/art-director/prompt-curator.ts (신규) — CVR 기준 확정판
- 같은 intent_tag + category_hint 그룹 내에서
  **revenueAttribution30d (또는 orders30d) 상위 20%** 프롬프트 식별
  (CTR 불가하므로 매출/주문이 유일한 성과 지표)
- 상위: seller_rating 자동 가산 (or strategic_role = 'promoted')
- 하위 20% + 충분한 사용량(orders30d 집계 대상이 된 지 30일+): deprecated = true
  + deprecation_reason = 'low revenue over 30d'
- 월 1회 실행 (cron 또는 수동 트리거)
- ⚠️ 표본 부족 가드: 그룹 내 프롬프트가 5개 미만이거나 총 주문이 미미하면
  큐레이션 보류 (성급한 deprecate 방지). 1인 셀러 초기엔 데이터가 적음.

> 이 큐레이터가 "프롬프트가 스스로 진화하는" 엔진.
>   모델 교체돼도 intent별 승자 프롬프트 데이터는 누적 = moat.

---

## 4. 의존성·순서

```
[선행] HANDOFF_PROMPT_ASSET_ENGINE.md 완료 (db pull + 어댑터)
  ↓
[1] 네이버 통계 API 가용성 검증 (CTR 받아올 수 있나?)
  ↓
[2] metrics-collector.ts + cron route (CVR 우선, CTR 가능시 추가)
  ↓
[3] prompt-curator.ts (강화학습 큐레이션)
  ↓
[검증] 실제 등록 상품 1개로 30일 후 데이터 회수 확인
```

> [2]는 [1] 결과에 따라 설계 분기. CTR 불가 시 CVR-only로 축소.

---

## 5. 커밋 (작업원칙 #17)
```
feat(metrics): CTR/CVR 자동 회수 파이프라인

- metrics-collector.ts (네이버 통계 30일 회수)
- /api/cron/metrics-sync route (CRON_SECRET, 일1회)
- prompt-curator.ts (intent별 상위20% 승격 / 하위20% deprecate)
- business_metrics dataSource 출처 추적
- 근거: HANDOFF_CTR_CVR_PIPELINE.md
```

---

## 6. 완료 후 핸드백 (Target Session: claude-web)
- 네이버 통계 API 가용성 결과 (CTR 자동화 가능 여부)
- 실제 회수 데이터 샘플 1건
- 다음: 게이트3 UI에 "이 프롬프트의 전환 성과" 표시 위젯

---

(끝 — 연료관 연결. 단 CTR 가용성은 반드시 먼저 검증, 헛코드 금지.)
