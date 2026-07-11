# 카테고리 SEO×ROI 종합 추천 엔진 — 스펙 (2026-07-11)

Authoring: DESKTOP(코드 실측 조사). 계기: 백로그 자율 착수(운영자 결정 불필요·매출 직결). 권위: 기존 코드. 원칙 #55/#62/#233. 상태: 스펙 완료·Code 구현 대기(독립).

## 0. 현행 (실측)
- `api/category/suggest/route.ts`(418L): AI + FALLBACK 키워드 규칙 → 상품명에서 **카테고리 매핑**(어느 카테고리인지). SEO/ROI 랭킹 없음.
- `lib/naver/category-trend-cache.ts`: DataLab Shopping Insights 트렌드 점수(trendScore 0..100·hot/warm/cold) — **D1 최상위 10개만**·캐시(1000/day 제한).
- `lib/naver-margin-advisor.ts`: getMarginAdvice(d1,d2,d3)·calcBreakeven/RecommendedPrice·2026 수수료(중소3 5.733%) — ROI 재료.
- `components/studio/engine/CategoryDnaCard.tsx`: 카테고리 DNA UI(표시 지점).
- ★갭: SEO(트렌드)와 ROI(마진)가 **결합·랭킹 안 됨**. 셀러가 "검색 잘 되면서 마진 좋은 카테고리"를 못 고름.

## 1. 목표
- 상품에 후보 카테고리가 여럿일 때(또는 현재 카테고리 평가 시), **SEO 점수 × ROI 점수 = 종합 추천 점수**로 랭킹해 "검색 유리 + 수익 좋은" 카테고리를 셀러가 선택하게. 파워셀러 실무 프레임(검색량·경쟁·마진).

## 2. 설계 — computeCategoryScore (systemic·순수함수)
`src/lib/naver/category-score.ts` 신설:
```
computeCategoryScore({d1,d2,d3, supplierPrice?}) → {
  seoScore: 0..100,     // 트렌드(가용) — 현재 D1 trendScore 재사용, leaf는 근사
  roiScore: 0..100,     // margin-advisor 순마진율 정규화
  totalScore: 0..100,   // 가중합(기본 SEO 0.5 · ROI 0.5, 조정 가능)
  grade: 'S'|'A'|'B'|'C',
  reasons: string[],    // 셀러 언어("검색 상승세·마진 매력적" 등)
  caveats: string[]     // 한계 정직 표기
}
```
- **SEO**: category-trend-cache trendScore. ★한계: D1 최상위만 정밀 → leaf는 D1 상속 근사. 정밀 leaf 검색량은 DataLab 키워드 쿼리(1000/day·PlayMCP) 또는 검색광고 API 필요 → 후속.
- **ROI**: getMarginAdvice 순마진율 + (supplierPrice 있으면) calcRecommendedPrice 여력. 반품리스크율 반영.
- **가중치**: 기본 5:5. 셀러가 "검색 우선/수익 우선" 토글 시 조정(선택).

## 3. UI surface (외계어 배제·#233)
- CategoryDnaCard에 후보별 **종합 추천 배지(S~C) + 검색 열기(SEO) + 마진 매력도(ROI)** 막대. 라벨은 파워셀러 용어("검색 상승세·순마진 X%·종합 추천").
- category/suggest 응답에 후보 다건이면 totalScore desc 정렬 + 최상위 추천 표기.
- 상품 등록(씨앗심기)·허브에서 카테고리 선택 시 노출.

## 4. 데이터 한계 (정직·#231)
- leaf 검색량 정밀도 제한(D1 트렌드 근사) — 후속 DataLab 키워드/검색광고 API로 정밀화.
- 경쟁 강도(상품수/리뷰수)는 네이버 미제공/제한 → 스코어에서 제외 or 근사·크롤링 금지.
- caveats 필드로 "이 점수는 D1 트렌드 기반 근사" 명시.

## 5. 구현 절차 (Code·독립·단계)
1. `category-score.ts`(순수함수·유닛테스트: 트렌드↑마진↑→S·트렌드↓마진↓→C).
2. category/suggest 응답에 score 결합·다건 정렬.
3. CategoryDnaCard에 SEO/ROI/종합 막대+배지(셀러 언어).
4. tsc0/build0→배포→Desktop 검증(후보 랭킹·라벨 직관성·caveat 표기).
- 후속(별도): DataLab leaf 키워드 정밀 검색량·검색광고 API.

## 작업 유의사항/원칙 (신규)
- **#249** 흩어진 신호(트렌드=SEO·마진=ROI)를 결합할 땐 단일 순수함수(computeCategoryScore)로 묶고 UI는 그 결과만 표시(#62). 데이터 정밀도 한계(leaf 검색량·경쟁강도 미제공)는 caveats로 정직 표기(#231·크롤링 금지). 셀러 대면 지표는 외계어(trendScore·ratio) 대신 파워셀러 용어(검색 상승세·마진 매력도·종합 추천)로 번역(#233).
