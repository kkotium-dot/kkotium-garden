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

### 2-2. 회수 로직 (src/lib/metrics/metrics-collector.ts 신규)
```
1. art_director_prompts에서 result_image_url IS NOT NULL
   AND seller_used = true AND product_id IS NOT NULL 행 조회
   (= 실제 사용된 프롬프트만)
2. 각 product_id의 naverProductId로 네이버 통계 조회
   (Product 테이블에 naverProductId 컬럼 이미 존재 — 확인됨)
3. 30일 window: impressions, clicks, 주문건수, 매출
4. ctr30d = clicks / impressions (impressions 확보 시)
   cvr30d = orders / clicks (or orders / impressions)
5. business_metrics JSON 갱신 + metrics_refreshed_at = now()
```

### 2-3. business_metrics JSON 구조 (어제 DB 기본값과 일치)
```json
{
  "listingId": "네이버상품ID",
  "impressions30d": 0,
  "clicks30d": 0,
  "ctr30d": 0.0,
  "conversionRate30d": 0.0,
  "revenueAttribution30d": 0,
  "dataSource": "naver-commerce-api | manual | estimated",
  "windowStart": "ISO date",
  "windowEnd": "ISO date"
}
```
> dataSource 필드로 "자동/수동/추정" 출처 명시 (정직성 + 신뢰도 추적)

---

## 3. 강화학습 큐레이션 (회수 후)

src/lib/art-director/prompt-curator.ts (신규)
- 같은 intent_tag + category_hint 그룹 내에서
  ctr30d 또는 cvr30d 상위 20% 프롬프트 식별
- 상위: internal_score 자동 가산 (or "promoted" 플래그)
- 하위 20% + 충분한 노출(impressions > 임계): deprecated = true
  + deprecation_reason = "low CTR/CVR over 30d"
- 월 1회 실행 (cron 또는 수동 트리거)

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
