# HANDOFF — 키워드 확장 엔진 (1~3단계) Code 구현 명세

> 작성: 2026-06-03 Desktop | 권위: docs/research/RESEARCH_naver_keyword_expansion_engine_2026-06-03.md
> 베이스라인: 0e68a8c (origin/main, Vercel READY). 비가역 0 / 허위 0 #46 / Code register 호출 금지 #41.
> Desktop 코드 직독 검증 완료 (searchad-volume.ts / ai-generate/route.ts / groq.ts).

---

## 0. 핵심 발견 (Desktop 실측)

현재 `searchad-volume.ts`의 `fetchBatch`는 SearchAd `/keywordstool` 응답에서 **연관키워드(relKeyword)를 받고도 버린다**:
```
// 현재 코드 (보물을 버리는 한 줄)
const wanted = new Set(cleaned.map(normalizeKeyword));
if (!rel || !wanted.has(normalizeKeyword(rel))) continue;  // 입력과 정확히 일치하는 것만 남김
```
SearchAd는 seed 1개로 연관키워드 최대 ~1,200개를 검색량과 함께 반환하는데(RESEARCH §1), 현재는 입력 키워드 자신의 검색량만 추출하고 나머지를 폐기한다. **1단계 = 이 버려지는 연관키워드를 수확하는 것.** 추가 API 호출 0, 추가 비용 0.

---

## 1단계 [SCOPE A — seed 기반 연관키워드 확장]

### A-1. searchad-volume.ts — 연관키워드 수확 함수 신설
기존 `fetchKeywordVolumes`(정확 일치 검색량 조회)는 **변경 없이 보존**(다른 호출부 안전). 새 함수 추가:
```
export interface RelatedKeywordRow extends VolumeRow {
  // VolumeRow와 동일 구조 (keyword/monthlyPcQc/monthlyMobileQc/totalMonthlyQc/compIdx)
}

/** seed 키워드(최대 5개)로 /keywordstool 호출 후, 정확일치 필터 없이
 *  연관키워드 전체를 검색량과 함께 반환. 1단계 키워드 확장의 핵심 소스. */
export async function fetchRelatedKeywords(
  seeds: string[],
  opts?: { maxRows?: number },  // 기본 cap 예: 120 (1,200 전량은 과다)
): Promise<RelatedKeywordRow[] | null>
```
구현:
- `fetchBatch`와 동일한 인증/서명/요청. 차이는 **정확일치 필터 제거** — `keywordList` 전 행을 파싱.
- 각 행: relKeyword + parseCount(monthlyPcQcCnt/MobileQcCnt) + mapComp(compIdx). 기존 parseCount/mapComp/normalizeKeyword 재사용.
- "< 10" sentinel은 기존대로 5로 보존(#46 정직).
- maxRows로 상위 N개 cap (totalMonthlyQc 내림차순 정렬 후 slice). 기본 120.
- seeds는 최대 5개(SearchAd hintKeywords 한도). 2~15자, 공백제거, 콤마 strip — 기존 cleaned 로직 재사용.
- 실패 시 null(기존 패턴 동일). env 없으면 null.

### A-2. ai-generate/route.ts — seed 추출 + 연관키워드 풀 병합
`generateSEO` 내 후보 생성 단계 개조:
- **seed 추출**: 현재 `extractCandidates(productName)` 결과의 토큰(tokenCount분)에서 상위 1~3개 + 상품 카테고리명(있으면)을 seed로. 너무 일반적인 단어(GENERIC_TOKENS)는 seed 제외.
- **연관키워드 수확**: `fetchRelatedKeywords(seeds)` 호출 → 연관키워드 풀 확보.
- **풀 병합**: 기존 `bundle.pool`(상품명 파생) + 연관키워드 풀 → dedupe(normalizeKeyword). 이 통합 풀을 volumeMap 시드로 사용.
- 기존 `fetchKeywordVolumes(bundle.pool)` 호출은 연관키워드 수확으로 대체 가능하나, **안전하게 둘 다 수행 후 병합** 권장(연관키워드가 비거나 null이면 기존 경로로 graceful fallback).
- volumeSignal에 `relatedFetched: number`(연관키워드 수확 개수) 텔레메트리 추가.

### A-3. 검색량 검증 게이트 (LLM 환각 차단)
이미 존재하는 로직 강화: LLM이 낸 naver_keywords 중 volumeMap에 없는 것은 score 0으로 가라앉힘(현행 유지). **추가**: 최종 naver_keywords 채택 시 `totalMonthlyQc <= 0` 키워드는 제외(완전 폐기). 단 LLM 원본이 전멸하면 측정 풀 상위로 대체(빈 키워드 방지).

---

## 2단계 [SCOPE B — 황금키워드 + 반복단어 페널티 회피]

### B-1. 황금키워드 비율 스코어 (선택적 정렬 보강)
- RESEARCH §5: 비율 = 검색량 / 경쟁상품수. compIdx를 경쟁 프록시로 사용(상품수 API는 별도 — 후속).
- 현재 `scoreKeyword(volume, kw) = volume * intentMultiplier(kw)`에 compIdx 가중 추가:
  ```
  compMultiplier: LOW ×1.3 / MEDIUM ×1.0 / HIGH ×0.6 / null ×1.0
  scoreKeyword = volume × intentMultiplier × compMultiplier
  ```
- 효과: 검색량 높아도 경쟁 치열(HIGH)이면 감점, 낮은 경쟁(LOW)은 가점 → 신규 셀러 진입 키워드 우선.

### B-2. 반복단어 페널티 회피 강화 (네이버 SEO 감점 방지)
- RESEARCH §2: 네이버는 **동일 단어 3~4회+ 반복 시 노출 불이익**.
- 현재 length-fill(`titleAlreadyHas`)은 토큰 부분일치를 막지만, naver_title 전체에서 같은 단어가 3회+ 등장하는지 최종 검사 없음.
- 추가: naver_title 확정 후 **토큰 빈도 검사** — 2글자+ 토큰이 3회 이상 반복되면 마지막 중복 토큰 제거. volumeSignal에 `dupTokenTrimmed: boolean`.

### B-3. seo title 동일단어 검사도 동일 적용.

---

## 3단계 [SCOPE C — 429 백오프 + 캐싱]

### C-1. 429 지수 백오프 (searchad-volume.ts)
- RESEARCH §1: 키워드도구는 타 API 대비 1/5~1/6 제한. 429 빈발. 공식 권고 = 429 시 5~6배 긴 sleep.
- `fetchBatch`/`fetchRelatedKeywords`에 429 감지 시 지수 백오프 재시도(최대 2~3회, 초기 sleep 1000ms → 5~6배). 429 외 에러는 즉시 null.
- 현재 배치 간 throttle 150ms는 유지하되, 연관키워드 호출은 seed가 적으므로(1~5개) 호출 수 자체가 적어 부담 낮음.

### C-2. 키워드 검색량 캐싱 (in-memory, TTL)
- 동일 seed 재호출 방지. Map<normalizedSeed, {rows, expiresAt}>, TTL 예 6시간.
- 서버리스(Vercel) 환경은 인스턴스 재사용 시에만 유효 — best-effort 캐시. 영구 캐시는 후속(DB 테이블 keyword_volume_cache) 검토.
- 효과: 같은 상품 SEO 재실행, 유사 카테고리 상품 연속 처리 시 429 위험·지연 감소.

---

## 검증 (작업5)
- TSC 0 + build 0 + verify-vercel.
- 명화 방향제(cmpnooli40001f0gveaxr8iim) SEO 재생성 dryRun:
  - volumeSignal.relatedFetched > 0 (연관키워드 수확 확인)
  - naver_keywords에 상품명에 없던 시장 키워드(예 차량용디퓨저류) 등장 확인
  - 동일단어 3회+ 반복 없음
  - 모든 채택 키워드 totalMonthlyQc > 0 (환각 0)
- Desktop가 publish-readiness 재호출 → seoComplete=true → publishReady=true 단정.

## 절대준수
비가역 0 (Code register 금지 #41) / 허위 0 #46 (측정 안 된 키워드 score 0·폐기, 검색량 날조 금지)
Prisma 싱글톤 / heredoc 금지 #26 / 한글 MD = Python safe-insert #29b / commit 한글 = .commit-msg.tmp #17
push 후 verify-vercel #36 / Production = Vercel only #28 / SD-01 footer 미접촉
기존 fetchKeywordVolumes 시그니처 보존(다른 호출부 안전) — 신규 함수로 확장.

## 단계 분리 권고
1단계(SCOPE A)만 먼저 출하 → Desktop 검증(연관키워드 수확 + 명화 방향제 SEO 점수 상승 확인) → 2·3단계 순차.
1단계만으로 후보 15개 → 100개+ 확장, 첫 발행 SEO 즉시 체감.

## 마무리
SCOPE A 출하 → Desktop SEO 재생성·게이트 재단정 → (필요시) 키워드 전략 대표 확인 →
publishReady=true → 대표 승인 → 첫 발행.
