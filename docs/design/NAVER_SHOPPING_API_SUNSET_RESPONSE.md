# 네이버 쇼핑검색 API 종료 대응 — 영향 분석 및 재설계 방향

> **작성**: 2026-08-01 Desktop · **트리거**: SE05 근본원인이 "운영자 설정 문제"가 아니라 "네이버가 2026-07-31 쇼핑검색 API를 영구 종료"로 확정됨(공식 공지 실측)
> **성격**: 단건 버그 아님 — **11개 파일이 폐기된 API에 의존하는 프로젝트 전체 사안**(전 상품 공통 시스템 관점)
> **관련 원칙**: #310(미실측 단정 금지 — 이 사건이 위반 사례) · #55(전상품 범용) · #62(프로젝트 전체 확장)

---

## 1. 확정된 사실 (네이버 공식 공지 실측)

| 출처 | 내용 |
|---|---|
| `developers.naver.com/notice/article/32564` | 네이버 개발자센터 검색 **'쇼핑/책/전문자료' API가 2026년 7월 31일(금) 서비스 종료** |
| `developers.naver.com/notice/article/32530` | 이 3개는 **NAVER API HUB 이관 대상에서도 제외** — 유예기간 없이 완전 종료. 대체 API HUB 경로 없음 |

**결과**: `https://openapi.naver.com/v1/search/shop.json` 호출 시 **HTTP 404 / errorCode SE05** ("존재하지 않는 검색 api"). 발급 키·앱 설정과 무관 — API 자체가 사라짐.

**살아있는 것**: DataLab(검색어 트렌드)·쇼핑인사이트는 API HUB로 **이관되어 계속 사용 가능**. 검색광고 API(keywordstool)도 정상. → 검색량·트렌드·경쟁지수는 여전히 확보 가능.

**Desktop 진단 오류 정정**: 이전에 Desktop이 "운영자가 개발자센터에서 검색 API 권한 등록 필요"로 단정했으나 **틀렸다**. 운영자가 "설정 문제 없어 보인다"고 지적 → 공식 공지 실측으로 정정 확정. 미실측 단정 금지(#310) 재확인.

---

## 2. 영향 범위 — 11개 파일 (전 상품 공통, 단건 아님)

`searchShopping()` / `analyzeCompetition()` (둘 다 `shopping-search.ts`, 폐기 API 사용) 소비처:

| 파일 | 용도 | 잃는 것 |
|---|---|---|
| `sourcing-recommender.ts` | 소싱 후보 경쟁분석 | 경쟁레벨·가격대 → **후보 0건** |
| `recommendation-runner.ts` | 일간 추천 | 시장 컨텍스트 |
| `naver/keyword-competition/route.ts` | 키워드 경쟁도 | productCount |
| `naver/market-analysis/route.ts` | 시장 분석 | 경쟁·가격 |
| `naver-seo/ai-generate/route.ts` | SEO AI 생성 | 시장 참고 데이터 |
| `kkotti-comment/route.ts` | 꼬띠 코멘트 | 시장 언급 |
| `datalab/route.ts` | 데이터랩 | (교차 확인 필요) |
| `competition-monitor.ts` | 경쟁 모니터 | 경쟁 스냅샷 |
| `strategy/identity-extractor.ts` | 상품 정체성 추출 | 경쟁 상품 샘플 |
| `strategy/signal-collector.ts` | 시그널 수집 | 시장 시그널 |
| `strategy/identity-dictionary.ts` | 정체성 사전 | 참고 데이터 |

→ **하나씩 고치면 안 된다.** 공통 추상화 계층을 하나 만들고 11곳이 그것을 쓰게 한다(#62).

---

## 3. 재설계 방향 (3단계, 의존성 순서)

### 3-A. 즉시(최소 수정) — 경쟁분석을 검색광고 경쟁지수로 대체
소싱 파이프라인만 우선 되살린다.
- `keyword-stats`(검색광고, 살아있음)가 이미 `competition: low/mid/high`(compIdx)를 반환한다. 실측 확인: 수납장=mid, 청소기=high, 요가매트=high.
- 소싱 엔진의 `calcBlueOceanScore()`는 **이미 `competition` 값을 쓴다.** productCount 없이도 점수 산출 가능.
- **최소 수정**: `analyzeCompetition()` 호출을 제거하거나, productCount·avgPrice가 null이어도 파이프라인이 죽지 않게 한다. 가격대(avgPrice)는 도매매칭 단계의 도매가·네이버 커머스 API로 보완.
- 이렇게 하면 **소싱 후보가 즉시 생성**된다(검색량 + 검색광고 경쟁지수만으로 블루오션 판정).

### 3-B. 단기 — 공통 경쟁분석 추상화 계층 신설
- `src/lib/market/competition-provider.ts`(신규) — "경쟁도·가격대를 얻는다"는 인터페이스를 정의하고, 내부 구현을 검색광고+커머스API 조합으로.
- 11개 파일이 `shopping-search.ts` 직접 호출 대신 이 provider를 쓰게 점진 이관.
- **멀티플랫폼 대비**(운영자 방향): provider 인터페이스를 플랫폼 중립으로 설계하면, 나중에 쿠팡·해외 플랫폼 경쟁분석도 어댑터만 추가하면 된다.

### 3-C. 중기 — 쇼핑인사이트(API HUB) 도입 검토
- 가격대·카테고리 트렌드가 꼭 필요하면 NAVER API HUB의 쇼핑인사이트 이관 신청.
- 단, 추가 인증·비용 확인 필요. 3-A/3-B로 충분하면 후순위.

---

## 4. 하지 말 것
- ❌ `shopping-search.ts`를 11곳에서 각자 다르게 땜질 — 공통 계층으로(#62)
- ❌ productCount를 가짜값으로 채우기 — 정직성 위반(#310, "never fabricate")
- ❌ 폐기된 API에 재시도 로직 추가 — 살아나지 않음
- ❌ 소싱만 고치고 나머지 10곳 방치 — 전 상품 공통 관점 유지

## 5. 검증 계획
- 3-A 후 dry-run으로 소싱 후보 1건+ 생성 확인(로컬은 검색광고 키 있으므로 검증 가능)
- 11개 파일 각각이 쇼핑검색 없이도 크래시 안 나는지 확인(각 기능 실호출)
- 브라우저로 시장분석·SEO생성 화면이 정상 렌더되는지 실측
