# SEO 상품명 진단 강화 엔진 — 스펙 (2026-07-12)

Authoring: CODE-CLI(코드 실측 조사). 계기: 운영자 승인(부활 대상 상품명 약점 진단+개선제안, 매출 직결). 권위: 기존 코드. 원칙 #231/#233/#249/#55/#62. 상태: 스펙 완료·Code 구현 대기.

## 0. 현행 (실측) — ★중복 방지 발견

- `lib/seo/product-name-diagnosis.ts`: **이미 존재하는 성숙한 순수 엔진** `diagnoseProductName(name, ctx)`. 8개 체크(글자수·키워드포함·띄어쓰기·중복단어·특수문자·금지어·브랜드분리·카테고리적합) + 인라인 "이렇게 고치기" fix + score/grade. 금지어 데이터는 `banned-words.ko.json`. 소비처: products/new(풀 패널 `ProductNameDiagnostics.tsx`), keyword-competition route.
- `lib/products/revival-score.ts`: 부활 시급도 스코어. 상품명 신호는 **거친 boolean** `isWeakNameSeo(name)`(짧음/토큰수/특수문자)만 사용 — 진단 상세 없음.
- `lib/naver/category-score.ts`(#249): `computeCategoryScore` — SEO(트렌드)×ROI(마진) 순수함수.
- ★갭: (1) 상품명 진단에 **트렌드반영(카테고리 검색 유리도) 축이 없음**. (2) 실패/경고 체크를 **개선안 1~3개로 압축·랭킹**하지 않음. (3) **데이터 한계(#231) 표기 없음**. (4) **부활소(reactivation)·허브(products) 목록에 진단 배지 미노출**.

## 1. 목표

부활 후보 상품의 **상품명 약점을 한눈에 진단**하고 **가장 효과 큰 개선 1~3개**를 셀러 언어로 제시. 신규 엔진을 짜지 않고 **기존 `diagnoseProductName` + `computeCategoryScore`를 결합(#249 흐름)**해 단일 순수함수로 묶고 UI는 결과만 표시(#62). 중복 구현 금지.

## 2. 설계 — computeNameDiagnosis (composition·순수함수)

`lib/seo/product-name-diagnosis.ts`에 추가(같은 모듈에 상품명 진단 응집):

```
computeNameDiagnosis({
  name, d1?, d2?, d3?, categoryPath?, keywords?, brand?, supplierPrice?, trend?
}) → {
  nameScore, nameGrade,                 // diagnoseProductName 재사용
  categoryScore: CategoryScore | null,  // computeCategoryScore 재사용(#249, 트렌드반영)
  trendReflected: 'strong'|'ok'|'weak'|'unknown',
  weaknesses: [{ id, label, severity:'fail'|'warn', detail }],  // 랭킹
  suggestions: string[1..3],            // 개선안(셀러 언어 #233)
  caveats: string[],                    // 데이터 한계(#231)
  grade: 'S'|'A'|'B'|'C'                // 종합(상품명 중심 + 트렌드 nudge)
}
```

- **재사용**: base = `diagnoseProductName(name,{categoryPath,keywords,brand})`. category = d1 있으면(없으면 categoryPath 파싱) `computeCategoryScore({d1,d2,d3,supplierPrice,trend})`.
- **트렌드반영**: categoryScore.seoScore 밴드 → trendReflected(≥60 strong·≥30 ok·>0 weak). trend=null → unknown(중립, 감점 없음).
- **weaknesses 랭킹**: base.checks 중 fail→warn, 페널티 가중치 desc 정렬.
- **suggestions(#233)**: 랭킹된 weakness의 suggestion을 최대 3개. 트렌드 weak면 "검색 상승세 세부 키워드를 앞에" 1건 추가(셀러 언어, 외계어 배제).
- **caveats(#231)**: categoryScore.caveats(leaf 근사·경쟁강도 제외) + 키워드 미확보 시 "키워드 포함 진단은 참고용" 병합·중복제거.
- **종합 grade**: nameScore 기준, trendReflected strong +5 / weak −5 nudge 후 등급화. categoryScore는 SEO×ROI 맥락으로 별도 노출(상품명 진단은 name-centric 유지).
- **순수성**: I/O·클럭 없음. trend는 호출자가 category-trend-cache에서 async 조회 후 주입(category-score와 동일 패턴).

## 3. UI surface (배지·#233)

- **부활소** `app/products/reactivation/page.tsx` 후보 행: 상품명 진단 배지(등급 + 최상위 약점 1줄 + "개선 N건"). 클릭 시 상세(검색 조련사 링크).
- **허브** `app/products/page.tsx` 목록 행: 동일 배지(경량).
- 배지는 `computeNameDiagnosis` 결과만 렌더(로직 0). 라벨은 파워셀러 용어(약점·개선·검색 유리도). Lucide 아이콘·이모지 0.
- 데이터 주입: 목록 API가 상품별 d1/d2/d3·공급가·(가능 시)키워드 + D1 트렌드 조회해 결과 부착, 또는 경량 클라 계산(트렌드 없으면 unknown).

## 4. 데이터 한계 (정직·#231)

- leaf 검색량·경쟁강도 한계는 category-score caveats 그대로 승계.
- 황금키워드 미확보 시 키워드 포함 진단은 참고용(허위 판정 금지).
- 리뷰수는 네이버 미제공 → 진단 축에서 제외(revival-score와 동일 원칙).

## 5. 구현 절차 (Code·독립·단계)

1. `computeNameDiagnosis`(순수함수·composition·유닛테스트: 금지어+무키워드→weakness/suggestion, 트렌드 strong/weak→trendReflected, 순수성).
2. 부활소/허브 목록에 진단 배지 부착(결과만 렌더).
3. tsc0/build0→배포→Desktop 검증(약점 랭킹·개선안 직관성·caveat 표기·배지 위치).

## 작업 유의사항/원칙

- **#249 흐름 일관**: 흩어진 신호(상품명 규칙 + 카테고리 SEO×ROI)를 단일 순수함수로 결합, UI는 결과만(#62). 기존 엔진 재사용, 중복 구현 금지(#34).
- 데이터 정밀도 한계는 caveats로 정직 표기(#231·크롤링 금지). 셀러 대면 지표는 외계어 대신 파워셀러 용어(#233).
